// Key validation endpoint tests: fake provider server, no real network/keys.
// Run: npm test (cwd = repo root).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 18233;
const FAKE = 18232;
const TOKEN = 'test-token-456';
const BASE = `http://127.0.0.1:${PORT}`;
const TASKS = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-keys-test-'));
let child = null;
let fake = null;

async function api(p, body, token = TOKEN) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + p, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}

before(async () => {
  fake = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const bearer = req.headers.authorization === 'Bearer good-key';
    const query = url.searchParams.get('key') === 'good-key';
    const xkey = req.headers['x-api-key'] === 'good-key';
    if (bearer || query || xkey) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"data":[]}');
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end('{"error":"bad"}');
    }
  });
  await new Promise((r) => fake.listen(FAKE, '127.0.0.1', r));
  const fakeUrl = `http://127.0.0.1:${FAKE}/models`;
  child = spawn(process.execPath, ['muse-spark-bridge.js'], {
    cwd: path.resolve('.'),
    env: {
      ...process.env, NOVA_PORT: String(PORT), NOVA_BRIDGE_TOKEN: TOKEN,
      NOVA_WORKER_MOCK: '1', NOVA_TASKS_DIR: TASKS, NOVA_SKIP_PROBE: '1',
      NOVA_URL_META: fakeUrl, NOVA_URL_OPENAI: fakeUrl, NOVA_URL_CODEX: fakeUrl,
      NOVA_URL_GROK: fakeUrl, NOVA_URL_CLAUDE: fakeUrl, NOVA_URL_GEMINI: fakeUrl,
    },
    stdio: 'ignore', windowsHide: true,
  });
  const t0 = Date.now();
  for (;;) {
    try { const r = await fetch(BASE + '/status'); if (r.ok) break; } catch { /* booting */ }
    if (Date.now() - t0 > 30000) throw new Error('bridge boot timeout');
    await new Promise((r) => setTimeout(r, 250));
  }
});

after(async () => {
  if (child) { try { child.kill(); } catch { /* gone */ } child = null; }
  if (fake) await new Promise((r) => fake.close(r));
  fs.rmSync(TASKS, { recursive: true, force: true });
});

test('KEYS: all three auth styles validate good vs bad', async () => {
  for (const provider of ['meta', 'openai', 'codex', 'grok']) {
    const g = await api('/api/keys/validate', { provider, key: 'good-key' });
    assert.equal(g.status, 200);
    assert.equal(g.json.ok, true, provider);
    const b = await api('/api/keys/validate', { provider, key: 'bad-key' });
    assert.equal(b.json.ok, false, provider);
    assert.equal(b.json.status, 401);
  }
  const gem = await api('/api/keys/validate', { provider: 'gemini', key: 'good-key' });
  assert.equal(gem.json.ok, true);
  const cl = await api('/api/keys/validate', { provider: 'claude', key: 'good-key' });
  assert.equal(cl.json.ok, true);
  const clBad = await api('/api/keys/validate', { provider: 'claude', key: 'nope' });
  assert.equal(clBad.json.ok, false);
});

test('KEYS: rejects bad input and missing auth', async () => {
  const u = await api('/api/keys/validate', { provider: 'nope', key: 'good-key' });
  assert.equal(u.status, 400);
  const m = await api('/api/keys/validate', { provider: 'meta' });
  assert.equal(m.status, 400);
  const n = await api('/api/keys/validate', { provider: 'meta', key: 'good-key' }, '');
  assert.equal(n.status, 401);
});
