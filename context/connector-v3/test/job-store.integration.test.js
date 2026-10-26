import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { JobStore } from '../src/job-store.js';

const connectionString = process.env.TEST_DATABASE_URL;
test('PostgreSQL leases cannot claim the same job twice', { skip: !connectionString && 'Set TEST_DATABASE_URL to a disposable PostgreSQL database.' }, async () => {
  const pool = new pg.Pool({ connectionString });
  const store = new JobStore(pool);
  const id = randomUUID();
  const principal = `integration-${id}`;
  try {
    await store.migrate();
    const generation = await store.registerWorker('integration-worker');
    await store.createJob({ id, principal, tool: 'codex_ask', idempotencyKey: id, sessionId: null, payload: { prompt: 'test' } });
    const claims = await Promise.all([
      store.claimNext('integration-worker', generation, 5000),
      store.claimNext('integration-worker', generation, 5000)
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
  } finally {
    await pool.query('DELETE FROM connector_jobs WHERE id=$1', [id]).catch(() => {});
    await pool.query('DELETE FROM connector_workers WHERE worker_id=$1', ['integration-worker']).catch(() => {});
    await pool.end();
  }
});

test('PostgreSQL queue capacity is enforced atomically', { skip: !connectionString && 'Set TEST_DATABASE_URL to a disposable PostgreSQL database.' }, async () => {
  const pool = new pg.Pool({ connectionString });
  const store = new JobStore(pool);
  const marker = `capacity-${randomUUID()}`;
  const ids = Array.from({ length: 11 }, () => randomUUID());
  try {
    await store.migrate();
    for (let index = 0; index < 10; index++) {
      await store.createJob({ id: ids[index], principal: marker, tool: 'codex_ask', idempotencyKey: ids[index], payload: { prompt: 'test' } }, 10);
    }
    await assert.rejects(store.createJob({ id: ids[10], principal: marker, tool: 'codex_ask', idempotencyKey: ids[10], payload: { prompt: 'test' } }, 10), error => error.code === 'QUEUE_FULL');
  } finally {
    await pool.query('DELETE FROM connector_jobs WHERE principal=$1', [marker]).catch(() => {});
    await pool.end();
  }
});
