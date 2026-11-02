// Workflow Manager black-box tests (mock worker): lifecycle, approvals, auth.
// Spawns the real bridge on a test port with NOVA_WORKER_MOCK=1 and a tmp tasks dir.
// Run: npm test (cwd = repo root).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 18231;
const TOKEN = 'test-token-123';
const BASE = `http://127.0.0.1:${PORT}`;
const TASKS = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-wf-test-'));
let child = null;

async function api(method, p, body, token = TOKEN) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch { /* keep null */ }
  return { status: res.status, json };
}

async function waitFor(cond, label, timeoutMs = 30000) {
  const t0 = Date.now();
  for (;;) {
    const v = await cond();
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) throw new Error('timeout: ' + label);
    await new Promise((r) => setTimeout(r, 250));
  }
}

before(async () => {
  child = spawn(process.execPath, ['muse-spark-bridge.js'], {
    cwd: path.resolve('.'),
    env: { ...process.env, NOVA_PORT: String(PORT), NOVA_BRIDGE_TOKEN: TOKEN, NOVA_WORKER_MOCK: '1', NOVA_TASKS_DIR: TASKS, NOVA_SKIP_PROBE: '1' },
    stdio: 'ignore', windowsHide: true,
  });
  await waitFor(async () => {
    try { const r = await fetch(BASE + '/status'); return r.ok || null; } catch { return null; }
  }, 'bridge boot');
});

after(async () => {
  if (child) { try { child.kill(); } catch { /* gone */ } child = null; }
  fs.rmSync(TASKS, { recursive: true, force: true });
});

test('WF: /api/* requires Bearer [REDACTED] when configured', async () => {
  const g = await api('GET', '/api/workflow', undefined, '');
  assert.equal(g.status, 401);
  const p = await api('POST', '/api/workflow', { goal: 'x', steps: [] }, '');
  assert.equal(p.status, 401);
  const a = await api('GET', '/api/agents', undefined, 'wrong');
  assert.equal(a.status, 401);
});

test('WF: invalid task input is rejected with 400', async () => {
  for (const bad of [
    {},
    { goal: '', steps: [{ agent: 'codex', instruction: 'x' }] },
    { goal: 'g', steps: [] },
    { goal: 'g', steps: [{ agent: 'nope', instruction: 'x' }] },
    { goal: 'g', steps: [{ agent: 'codex', instruction: '' }] },
    { goal: 'g', steps: [{ agent: 'codex', instruction: 'x' }], check: 'rm -rf /' },
    { goal: 'g', steps: [{ agent: 'codex', instruction: 'x' }], check: 'node evil.js; rm' },
  ]) {
    const r = await api('POST', '/api/workflow', bad);
    assert.equal(r.status, 400, JSON.stringify(bad));
  }
});

test('WF: full mock lifecycle codex->gemini ends in approval + approved', async () => {
  const c = await api('POST', '/api/workflow', {
    goal: 'mock demo goal',
    check: 'npm test',
    steps: [
      { agent: 'codex', instruction: 'mock implement' },
      { agent: 'gemini', instruction: 'mock review' },
    ],
  });
  assert.equal(c.status, 201);
  const id = c.json.id;
  assert.match(id, /^t[a-z0-9]+$/);

  const run = await api('POST', '/api/workflow/run', { id });
  assert.equal(run.status, 200);

  const done = await waitFor(async () => {
    const g = await api('GET', `/api/workflow?id=${id}`);
    return g.json.status === 'review_ready' ? g.json : null;
  }, 'mock task review_ready');
  assert.equal(done.steps[0].status, 'completed');
  assert.equal(done.steps[1].status, 'completed');
  assert.match(done.steps[0].output, /mock-ok:codex/);
  assert.match(done.steps[1].output, /mock-ok:gemini/);
  assert.ok(done.checkResult && done.checkResult.exitCode === 0);
  assert.ok(done.approvalId);

  const ap = await api('GET', '/api/approvals?status=pending');
  assert.equal(ap.status, 200);
  assert.ok(ap.json.some((a) => a.id === done.approvalId));

  const d = await api('POST', '/api/approvals/decide', { id: done.approvalId, decision: 'yes', by: 'Test' });
  assert.equal(d.status, 200);
  assert.equal(d.json.decision, 'yes');

  const fin = await api('GET', `/api/workflow?id=${id}`);
  assert.equal(fin.json.status, 'completed');
  assert.equal(fin.json.outcome, 'approved');

  const cl = await api('POST', '/api/workflow/cleanup', { id });
  assert.equal(cl.status, 200);
});

test('WF: muse step pauses for session input, reject path works', async () => {
  const c = await api('POST', '/api/workflow', {
    goal: 'mock muse goal',
    steps: [{ agent: 'muse', instruction: 'do it in chat session' }],
  });
  assert.equal(c.status, 201);
  const id = c.json.id;
  await api('POST', '/api/workflow/run', { id });
  await waitFor(async () => {
    const g = await api('GET', `/api/workflow?id=${id}`);
    return g.json.status === 'needs_input' ? true : null;
  }, 'muse needs_input');

  const bad = await api('POST', '/api/workflow/step-result', { taskId: id, stepId: 's9', output: 'x', status: 'completed' });
  assert.equal(bad.status, 409);

  const sub = await api('POST', '/api/workflow/step-result', { taskId: id, stepId: 's1', output: 'muse did it', status: 'completed' });
  assert.equal(sub.status, 200);
  const done = await waitFor(async () => {
    const g = await api('GET', `/api/workflow?id=${id}`);
    return g.json.status === 'review_ready' ? g.json : null;
  }, 'muse task review_ready');

  const d = await api('POST', '/api/approvals/decide', { id: done.approvalId, decision: 'no', by: 'Test' });
  assert.equal(d.status, 200);
  const fin = await api('GET', `/api/workflow?id=${id}`);
  assert.equal(fin.json.status, 'completed');
  assert.equal(fin.json.outcome, 'rejected');

  const again = await api('POST', '/api/approvals/decide', { id: done.approvalId, decision: 'yes', by: 'Test' });
  assert.equal(again.status, 409);
});

test('WF: cancel and agents handshake', async () => {
  const c = await api('POST', '/api/workflow', {
    goal: 'mock cancel goal',
    steps: [{ agent: 'codex', instruction: 'never runs' }],
  });
  const id = c.json.id;
  const k = await api('POST', '/api/workflow/cancel', { id });
  assert.equal(k.status, 200);
  assert.equal(k.json.status, 'cancelled');

  const g = await api('GET', '/api/agents');
  assert.equal(g.status, 200);
  assert.equal(g.json.length, 3);
  for (const a of g.json) {
    assert.ok(a.id && a.label && a.status && a.lastCheck);
  }
  assert.ok(g.json.some((a) => a.id === 'muse' && a.status === 'session'));
});
