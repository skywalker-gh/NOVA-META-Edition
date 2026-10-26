export class JobStore {
  constructor(pool) { this.pool = pool; }

  async registerWorker(workerId) {
    const { rows } = await this.pool.query(`INSERT INTO connector_workers(worker_id,generation,last_seen_at,connected)
      VALUES($1,1,now(),true) ON CONFLICT(worker_id) DO UPDATE SET generation=connector_workers.generation+1,last_seen_at=now(),connected=true
      RETURNING generation`, [workerId]);
    return Number(rows[0].generation);
  }

  async disconnectWorker(workerId, generation) {
    await this.pool.query('UPDATE connector_workers SET connected=false WHERE worker_id=$1 AND generation=$2', [workerId, generation]);
  }

  async migrate() {
    const { readFile } = await import('node:fs/promises');
    const sql = await readFile(new URL('../migrations/001_jobs.sql', import.meta.url), 'utf8');
    await this.pool.query(sql);
  }

  async createJob(job, maxPending = 10) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(1464113492)');
      const { rows: counts } = await client.query("SELECT count(*)::int AS n FROM connector_jobs WHERE state IN ('queued','leased','running')");
      if (counts[0].n >= maxPending) {
        const error = new Error('Queue limit reached.');
        error.code = 'QUEUE_FULL';
        throw error;
      }
      const { rows } = await client.query(
        `INSERT INTO connector_jobs (id, principal, tool, idempotency_key, session_id, payload, state)
         VALUES ($1,$2,$3,$4,$5,$6,'queued') RETURNING *`,
        [job.id, job.principal, job.tool, job.idempotencyKey, job.sessionId, job.payload]
      );
      await client.query('COMMIT');
      return mapJob(rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async findByIdempotency(principal, tool, key) {
    const { rows } = await this.pool.query('SELECT * FROM connector_jobs WHERE principal=$1 AND tool=$2 AND idempotency_key=$3', [principal, tool, key]);
    return rows[0] ? mapJob(rows[0]) : null;
  }

  async countPending() {
    const { rows } = await this.pool.query("SELECT count(*)::int AS n FROM connector_jobs WHERE state IN ('queued','leased','running')");
    return rows[0].n;
  }

  async get(id) {
    const { rows } = await this.pool.query('SELECT * FROM connector_jobs WHERE id=$1', [id]);
    return rows[0] ? mapJob(rows[0]) : null;
  }

  async claimNext(workerId, generation, leaseMs) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const worker = await client.query('SELECT generation,connected FROM connector_workers WHERE worker_id=$1 FOR UPDATE', [workerId]);
      if (!worker.rows[0]?.connected || Number(worker.rows[0].generation) !== Number(generation)) {
        await client.query('COMMIT');
        return null;
      }
      const { rows } = await client.query(
        `SELECT * FROM connector_jobs WHERE state='queued'
         AND NOT EXISTS (SELECT 1 FROM connector_jobs active WHERE active.state IN ('leased','running') AND active.session_id IS NOT DISTINCT FROM connector_jobs.session_id)
         AND EXISTS (SELECT 1 FROM connector_workers w WHERE w.worker_id=$1 AND w.generation=$2 AND w.connected=true)
         ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`, [workerId, generation]
      );
      if (!rows[0]) { await client.query('COMMIT'); return null; }
      const { rows: claimed } = await client.query(
        `UPDATE connector_jobs SET state='leased', worker_id=$2, worker_generation=$3,
         lease_expires_at=now()+($4::text || ' milliseconds')::interval, updated_at=now()
         WHERE id=$1 RETURNING *`, [rows[0].id, workerId, generation, leaseMs]
      );
      await client.query('COMMIT');
      return mapJob(claimed[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async setRunning(jobId, generation) {
    return this.#transition(jobId, generation, 'leased', 'running');
  }
  async complete(jobId, generation, result) { return this.#finish(jobId, generation, 'completed', result, null); }
  async fail(jobId, generation, error, terminal = true) {
    const state = !terminal ? 'queued' : error?.indeterminate ? 'indeterminate' : 'failed';
    return this.#finish(jobId, generation, state, null, error);
  }

  async #transition(id, generation, from, to) {
    const result = await this.pool.query(`UPDATE connector_jobs SET state=$3, updated_at=now() WHERE id=$1 AND worker_generation=$2 AND state=$4
      AND EXISTS (SELECT 1 FROM connector_workers WHERE worker_id=connector_jobs.worker_id AND generation=$2 AND connected=true)`, [id, generation, to, from]);
    if (!result.rowCount) throw new Error('Job lease is stale or no longer active.');
  }

  async #finish(id, generation, state, resultValue, errorValue) {
    const result = await this.pool.query(`UPDATE connector_jobs SET state=$3, result=$4, safe_error=$5, updated_at=now(), lease_expires_at=NULL WHERE id=$1 AND worker_generation=$2 AND state IN ('leased','running')
      AND EXISTS (SELECT 1 FROM connector_workers WHERE worker_id=connector_jobs.worker_id AND generation=$2 AND connected=true)`, [id, generation, state, resultValue, errorValue]);
    if (!result.rowCount) throw new Error('Job lease is stale or no longer active.');
  }

  async workerHeartbeat(workerId, generation) {
    const { rowCount } = await this.pool.query(`INSERT INTO connector_workers(worker_id,generation,last_seen_at,connected) VALUES($1,$2,now(),true)
      ON CONFLICT(worker_id) DO UPDATE SET generation=$2,last_seen_at=now(),connected=true WHERE connector_workers.generation <= $2`, [workerId, generation]);
    if (!rowCount) return;
    await this.pool.query(`UPDATE connector_jobs SET lease_expires_at=now()+interval '60 seconds',updated_at=now()
      WHERE worker_id=$1 AND worker_generation=$2 AND state IN ('leased','running')
      AND EXISTS (SELECT 1 FROM connector_workers WHERE worker_id=$1 AND generation=$2 AND connected=true)`, [workerId, generation]);
  }

  async getWorkerStatus(workerId) {
    const { rows } = await this.pool.query('SELECT generation,last_seen_at,connected FROM connector_workers WHERE worker_id=$1', [workerId]);
    const row = rows[0];
    const online = !!row?.connected && Date.now() - new Date(row.last_seen_at).getTime() < 15000;
    return { online, generation: row ? Number(row.generation) : null, lastSeenAt: row?.last_seen_at?.toISOString?.() ?? null };
  }

  async expireLeases(now, writeTool) {
    const { rows } = await this.pool.query(
      `UPDATE connector_jobs SET state=CASE WHEN tool=$2 THEN 'indeterminate' ELSE 'queued' END,
       worker_id=NULL, lease_expires_at=NULL, updated_at=$1 WHERE state IN ('leased','running') AND lease_expires_at <= $1 RETURNING id`,
      [now, writeTool]
    );
    return rows.length;
  }

  async purgeExpiredBodies(now = new Date()) {
    const { rowCount } = await this.pool.query('UPDATE connector_jobs SET payload=NULL,result=NULL,safe_error=NULL WHERE body_expires_at <= $1 AND (payload IS NOT NULL OR result IS NOT NULL OR safe_error IS NOT NULL)', [now]);
    return rowCount;
  }

  async purgeExpiredMetadata(now = new Date()) {
    const { rowCount } = await this.pool.query('DELETE FROM connector_jobs WHERE metadata_expires_at <= $1', [now]);
    return rowCount;
  }
}

function mapJob(row) {
  if (!row) return null;
  return { id: row.id, principal: row.principal, tool: row.tool, idempotencyKey: row.idempotency_key,
    sessionId: row.session_id, payload: row.payload, state: row.state, result: row.result,
    error: row.safe_error, createdAt: row.created_at?.toISOString?.() ?? row.created_at };
}
