import { createHash, randomUUID } from 'node:crypto';

const TERMINAL = new Set(['completed', 'failed', 'indeterminate']);
const WRITE_TOOL = 'codex_implement';

export class JobError extends Error {
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.name = 'JobError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class JobService {
  constructor(store, { pollMs = 250, maxPending = 10 } = {}) {
    this.store = store;
    this.pollMs = pollMs;
    this.maxPending = maxPending;
  }

  async submit(input) {
    const { principal, tool, payload, requestId, sessionId = null, timeoutSeconds = 300 } = input;
    if (!principal || !['codex_project_status', 'codex_ask', WRITE_TOOL].includes(tool)) {
      throw new JobError('invalid_job', 'The job request is invalid.');
    }
    const digest = createHash('sha256').update(JSON.stringify([principal, tool, sessionId, payload, timeoutSeconds])).digest('hex');
    const idempotencyKey = requestId || digest;
    const existing = await this.store.findByIdempotency(principal, tool, idempotencyKey);
    if (existing) return existing;
    const pending = await this.store.countPending();
    if (pending >= this.maxPending) throw new JobError('busy', 'The connector queue is busy.', { retryable: true });
    const row = {
      id: randomUUID(), principal, tool, idempotencyKey, sessionId,
      payload, state: 'queued', createdAt: new Date().toISOString()
    };
    try {
      return await this.store.createJob(row, this.maxPending);
    } catch (error) {
      if (error.code === 'QUEUE_FULL') throw new JobError('busy', 'The connector queue is busy.', { retryable: true });
      // A concurrent duplicate may win the unique constraint race.
      if (error.code === '23505') {
        const duplicate = await this.store.findByIdempotency(principal, tool, idempotencyKey);
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  async waitForResult(jobId, timeoutMs, signal) {
    const expires = Date.now() + timeoutMs;
    while (Date.now() < expires) {
      if (signal?.aborted) throw new JobError('cancelled', 'The request was cancelled.');
      const job = await this.store.get(jobId);
      if (!job) throw new JobError('not_found', 'The connector job was not found.');
      if (TERMINAL.has(job.state)) return job;
      await delay(Math.min(this.pollMs, Math.max(0, expires - Date.now())), signal);
    }
    throw new JobError('timeout', 'The connector did not finish before the request timed out.', { retryable: true });
  }

  async markExpiredLeases(now = new Date()) {
    return this.store.expireLeases(now, WRITE_TOOL);
  }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
    const abort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new JobError('cancelled', 'The request was cancelled.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    timer.unref?.();
    if (signal?.aborted) abort();
  });
}
