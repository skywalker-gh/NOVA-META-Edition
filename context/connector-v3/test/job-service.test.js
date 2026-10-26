import test from 'node:test';
import assert from 'node:assert/strict';
import { JobService } from '../src/job-service.js';

function memoryStore() {
  const jobs = [];
  return {
    jobs,
    async findByIdempotency(principal, tool, key) { return jobs.find(j => j.principal === principal && j.tool === tool && j.idempotencyKey === key) ?? null; },
    async countPending() { return jobs.filter(j => ['queued','leased','running'].includes(j.state)).length; },
    async createJob(job) { jobs.push(job); return job; },
    async get(id) { return jobs.find(j => j.id === id) ?? null; },
    async expireLeases(now, writeTool) {
      let count = 0;
      for (const job of jobs) if (job.leaseExpiresAt <= now) {
        job.state = job.tool === writeTool ? 'indeterminate' : 'queued'; count++;
      }
      return count;
    }
  };
}

test('submissions with the same identity and request are deduplicated', async () => {
  const store = memoryStore();
  const service = new JobService(store);
  const input = { principal: 'chatgpt-user', tool: 'codex_ask', payload: { prompt: 'inspect' }, sessionId: 's-1' };
  const first = await service.submit(input);
  const second = await service.submit(input);
  assert.equal(first.id, second.id);
  assert.equal(store.jobs.length, 1);
});

test('pending queue is bounded', async () => {
  const store = memoryStore();
  const service = new JobService(store, { maxPending: 1 });
  await service.submit({ principal: 'u', tool: 'codex_ask', payload: { prompt: 'a' } });
  await assert.rejects(service.submit({ principal: 'u', tool: 'codex_ask', requestId: 'another', payload: { prompt: 'b' } }), error => error.code === 'busy');
});

test('waitForResult returns terminal job and honors timeout and abort', async () => {
  const store = memoryStore();
  const service = new JobService(store, { pollMs: 5 });
  store.jobs.push({ id: 'done', state: 'completed', result: { text: 'ok' } });
  store.jobs.push({ id: 'pending', state: 'queued' });
  assert.equal((await service.waitForResult('done', 50)).state, 'completed');
  await assert.rejects(service.waitForResult('pending', 5), error => error.code === 'timeout');
  const controller = new AbortController();
  const waiting = service.waitForResult('pending', 100, controller.signal);
  controller.abort();
  await assert.rejects(waiting, error => error.code === 'cancelled');
});

test('expired implementation leases become indeterminate and are not replayed', async () => {
  const store = memoryStore();
  const service = new JobService(store);
  store.jobs.push({ id: 'write', tool: 'codex_implement', state: 'running', leaseExpiresAt: new Date(0) });
  store.jobs.push({ id: 'read', tool: 'codex_ask', state: 'running', leaseExpiresAt: new Date(0) });
  assert.equal(await service.markExpiredLeases(new Date()), 2);
  assert.equal(store.jobs[0].state, 'indeterminate');
  assert.equal(store.jobs[1].state, 'queued');
});
