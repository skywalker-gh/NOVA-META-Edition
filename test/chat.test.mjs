// Provider fan-out + memory index tests: fake providers, no real network/keys.
// Run: npm test (cwd = repo root).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildContext } = require('../nova-memory.js');

const PORT = 18235;
const FAKE = 18234;
const TOKEN = 'test-token-789';
const BASE = `http://127.0.0.1:${PORT}`;
const TASKS = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-chat-test-'));
let child = null;
let fake = null;

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { resolve({}); } });
  });
}
const memMark = (s) => String(s || '').includes('# NOVA Memory') ? 'mem-ok' : 'mem-missing';

before(async () => {
  fake = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.method === 'POST' && url.pathname === '/chat') {
      const b = await readBody(req);
      const sys = (b.messages || []).find((m) => m.role === 'system');
      return json(200, { model: b.model, choices: [{ message: { content: 'RE:' + memMark(sys && sys.content) + ' model:' + b.model } }] });
    }
    if (req.method === 'POST' && url.pathname === '/messages') {
      const b = await readBody(req);
      return json(200, { model: b.model, content: [{ text: 'RE:' + memMark(b.system) }] });
    }
    if (req.method === 'POST' && url.pathname.startsWith('/gemini/')) {
      const b = await readBody(req);
      const text = b.contents?.[0]?.parts?.map((p) => p.text).join('\n');
      return json(200, { candidates: [{ content: { parts: [{ text: 'RE:' + memMark(text) }] } }] });
    }
    if (req.method === 'POST' && url.pathname === '/image') {
      const b = await readBody(req);
      if (!b.prompt) return json(400, { error: 'no prompt' });
      return json(200, { created: 1, data: [{ b64_json: 'ZmFrZS1pbWc=' }] });
    }
    return json(404, { error: 'nope' });
  });
  await new Promise((r) => fake.listen(FAKE, '127.0.0.1', r));
  const F = `http://127.0.0.1:${FAKE}`;
  child = spawn(process.execPath, ['muse-spark-bridge.js'], {
    cwd: path.resolve('.'),
    env: {
      ...process.env, NOVA_PORT: String(PORT), NOVA_BRIDGE_TOKEN: TOKEN,
      NOVA_WORKER_MOCK: '1', NOVA_TASKS_DIR: TASKS, NOVA_SKIP_PROBE: '1',
      NOVA_CHAT_URL_META: F + '/chat', NOVA_CHAT_URL_OPENAI: F + '/chat', NOVA_CHAT_URL_GROK: F + '/chat',
      NOVA_CHAT_URL_ANTHROPIC: F + '/messages', NOVA_CHAT_URL_GOOGLE: F + '/gemini',
      NOVA_IMAGE_URL: F + '/image',
      META_API_KEY: 'test-not-real', OPENAI_API_KEY: '', XAI_API_KEY: '', ANTHROPIC_API_KEY: '', GOOGLE_AI_KEY: '',
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

async function api(method, p, body, token = TOKEN) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}

test('CHAT: fan-out reaches all 6 providers with memory injected', async () => {
  const keys = { spark: 'test-key', wonder: 'test-key', chatgpt: 'test-key', grok: 'test-key', claude: 'test-key', gemini: 'test-key' };
  const r = await api('POST', '/api/chat', { message: 'ping', providers: Object.keys(keys), keys });
  assert.equal(r.status, 200);
  assert.equal(r.json.results.length, 6);
  for (const x of r.json.results) {
    assert.equal(x.ok, true, x.provider + ': ' + x.error);
    assert.match(x.reply, /mem-ok/, x.provider + ' has memory');
  }
  assert.ok(r.json.memory.chars > 500, 'memory attached');
});

test('CHAT: missing key is an honest per-provider error', async () => {
  const r = await api('POST', '/api/chat', { message: 'ping', providers: ['chatgpt'], keys: {} });
  assert.equal(r.status, 200);
  assert.equal(r.json.results[0].ok, false);
  assert.match(r.json.results[0].error, /no key/);
});

test('CHAT: validation errors and auth', async () => {
  const e1 = await api('POST', '/api/chat', { message: '', providers: ['spark'] });
  assert.equal(e1.status, 400);
  const e2 = await api('POST', '/api/chat', { message: 'x', providers: ['nope'] });
  assert.equal(e2.status, 400);
  const e3 = await api('POST', '/api/chat', { message: 'x', providers: ['spark'] }, '');
  assert.equal(e3.status, 401);
  const e4 = await api('GET', '/api/memory/index', undefined, '');
  assert.equal(e4.status, 401);
  const e5 = await api('POST', '/api/image', { prompt: '' });
  assert.equal(e5.status, 400);
});

test('CHAT: image via fake + memory index lists real sources', async () => {
  const img = await api('POST', '/api/image', { prompt: 'a dot', key: 'test-key' });
  assert.equal(img.status, 200);
  assert.equal(img.json.ok, true);
  assert.equal(img.json.b64, 'ZmFrZS1pbWc=');
  const idx = await api('GET', '/api/memory/index');
  assert.equal(idx.status, 200);
  const ids = idx.json.sources.map((s) => s.id);
  assert.ok(ids.includes('project-context'));
  assert.ok(ids.includes('models-consensus'));
  const ctx = await api('GET', '/api/memory/context?budget=1000');
  assert.ok(ctx.json.system.includes('# NOVA Memory'));
  assert.ok(ctx.json.totalChars <= 1400);
});

test('CHAT: buildContext budgets and truncates deterministically', () => {
  const src = [
    { id: 'a', text: 'x'.repeat(5000) },
    { id: 'b', text: 'y'.repeat(5000) },
  ];
  const r = buildContext(src, 1000);
  assert.ok(r.totalChars <= 1100);
  assert.deepEqual(r.used.map((u) => u.id), ['a']);
  assert.ok(r.truncated.some((t) => String(t).startsWith('b')));
});
