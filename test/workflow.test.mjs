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
  assert.match(done.steps[1].prompt || '', /mock-ok:codex/, 'step output flows into next prompt');

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

test('WF: merge blocked without Human Authority approval, works after yes', async () => {
  const c = await api('POST', '/api/workflow', {
    goal: 'mock merge goal',
    steps: [{ agent: 'codex', instruction: 'change something' }],
  });
  assert.equal(c.status, 201);
  const id = c.json.id;

  const early = await api('POST', '/api/workflow/merge', { id });
  assert.equal(early.status, 409);
  assert.match(early.json.error, /Human Authority approval/);

  await api('POST', '/api/workflow/run', { id });
  const done = await waitFor(async () => {
    const g = await api('GET', `/api/workflow?id=${id}`);
    return g.json.status === 'review_ready' ? g.json : null;
  }, 'merge task review_ready');

  const pre = await api('POST', '/api/workflow/merge', { id });
  assert.equal(pre.status, 409);

  const d = await api('POST', '/api/approvals/decide', { id: done.approvalId, decision: 'yes', by: 'Test' });
  assert.equal(d.status, 200);

  const m = await api('POST', '/api/workflow/merge', { id });
  assert.equal(m.status, 200);
  assert.equal(m.json.ok, true);
  assert.ok(m.json.task.mergedAt);

  const twice = await api('POST', '/api/workflow/merge', { id });
  assert.equal(twice.status, 409);
  assert.match(twice.json.error, /already merged/);

  const ghost = await api('POST', '/api/workflow/merge', { id: 't-nope' });
  assert.equal(ghost.status, 404);
});

test('WF: grok reviewer runs as mock step, agents list grok', async () => {
  const g = await api('GET', '/api/agents');
  assert.equal(g.status, 200);
  const grok = g.json.find((a) => a.id === 'grok');
  assert.ok(grok, 'agents must include grok');
  assert.ok(['ready', 'unavailable'].includes(grok.status));
  assert.equal(grok.role, 'reviewer');

  const c = await api('POST', '/api/workflow', {
    goal: 'mock grok review goal',
    steps: [
      { agent: 'codex', instruction: 'write thing' },
      { agent: 'grok', instruction: 'review thing' },
    ],
  });
  assert.equal(c.status, 201);
  const id = c.json.id;
  await api('POST', '/api/workflow/run', { id });
  const done = await waitFor(async () => {
    const t = await api('GET', `/api/workflow?id=${id}`);
    return t.json.status === 'review_ready' ? t.json : null;
  }, 'grok task review_ready');
  assert.equal(done.steps[1].status, 'completed');
  assert.match(done.steps[1].output, /mock-ok:grok/);
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
  assert.equal(g.json.length, 4);
  for (const a of g.json) {
    assert.ok(a.id && a.label && a.status && a.lastCheck);
  }
  assert.ok(g.json.some((a) => a.id === 'muse' && a.status === 'session'));
  assert.ok(g.json.some((a) => a.id === 'grok' && a.role === 'reviewer'));
});

test('WF: /v6 serves the V6 dashboard (public, same-origin UI)', async () => {
  for (const p of ['/v6', '/v6/']) {
    const r = await fetch(BASE + p);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /text\/html/);
    const html = await r.text();
    assert.ok(html.includes('wfCanvas'), p + ' must contain the flow canvas');
    assert.ok(html.includes('wfGarage'), p + ' must contain the garage');
  }
});

test('WF: /grafik serves banner, blocks escape and non-images', async () => {
  const img = await fetch(BASE + '/grafik/NOVA_Ygdrassil_Banner.jpg', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/jpeg');
  assert.ok((await img.arrayBuffer()).byteLength > 10000);
  // URL parser normalizes ../ away (route miss); deeper containment is unit-tested in p0.
  const esc = await fetch(BASE + '/grafik/../../package.json', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(esc.status, 404);
  const miss = await fetch(BASE + '/grafik/nope.png', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(miss.status, 404);
  const spaced = await fetch(BASE + '/grafik/nova-new-chat-side3%20Kopie.png', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(spaced.status, 200);
  assert.equal(spaced.headers.get('content-type'), 'image/png');
  const txt = await fetch(BASE + '/grafik/x.txt', { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(txt.status, 404);
});

test('WF: /nova-sounds serves mp3 + map, blocks escape and non-audio', async () => {
  const auth = { authorization: `Bearer ${TOKEN}` };
  const mp3 = await fetch(BASE + '/nova-sounds/nova_ui_bass_hit.mp3', { headers: auth });
  assert.equal(mp3.status, 200);
  assert.equal(mp3.headers.get('content-type'), 'audio/mpeg');
  assert.ok((await mp3.arrayBuffer()).byteLength > 1000);
  const map = await fetch(BASE + '/nova-sounds/sounds-map.json', { headers: auth });
  assert.equal(map.status, 200);
  assert.equal(map.headers.get('content-type'), 'application/json');
  const miss = await fetch(BASE + '/nova-sounds/nope.mp3', { headers: auth });
  assert.equal(miss.status, 404);
  const txt = await fetch(BASE + '/nova-sounds/x.txt', { headers: auth });
  assert.equal(txt.status, 404);
});
