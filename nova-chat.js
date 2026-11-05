// NOVA provider fan-out: one memory-aware call across all connected models.
// Server-side calls (P0 auth via /api/*). Keys: transient browser key wins,
// else server env / connector .env. Keys are NEVER stored or logged.
const fs = require('fs');
const path = require('path');

const META_BASE = process.env.META_ENDPOINT || 'https://api.meta.ai/v1';

const PROVIDERS = {
  spark: {
    label: 'Muse Spark', model: process.env.MUSE_SPARK_MODEL || 'muse-spark-1.3-contributor',
    kind: 'openai-chat', url: process.env.NOVA_CHAT_URL_META || `${META_BASE}/chat/completions`,
    envKey: 'META_API_KEY', maxTokens: 3000, // heavy reasoner: ~150 tokens even for "OK"
    role: 'You are Muse Spark, NOVA privileged orchestrator. Plan concretely from project memory, cite it, end with the next action.',
  },
  wonder: {
    label: 'Muse Wonder', model: process.env.MUSE_WONDER_MODEL || 'muse-wonder-1.0',
    kind: 'openai-chat', url: process.env.NOVA_CHAT_URL_META || `${META_BASE}/chat/completions`,
    envKey: 'META_API_KEY', maxTokens: 4000, // deep reasoner: 2000 starved it to (empty), like spark at 1200
    role: 'You are Muse Wonder, NOVA deep reasoning. Analyze tradeoffs from project memory and mark uncertainty explicitly.',
  },
  chatgpt: {
    label: 'ChatGPT', model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    kind: 'openai-chat', url: process.env.NOVA_CHAT_URL_OPENAI || 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    role: 'You are ChatGPT, NOVA core reasoning peer. Answer thoroughly and contextually from the project memory below.',
  },
  grok: {
    label: 'Grok', model: process.env.GROK_MODEL || 'grok-4',
    kind: 'openai-chat', url: process.env.NOVA_CHAT_URL_GROK || 'https://api.x.ai/v1/chat/completions',
    envKey: 'XAI_API_KEY',
    role: 'You are Grok, NOVA independent adversarial reviewer (read-only). Challenge assumptions, return VERIFIED vs UNVERIFIED findings. Proposals are evidence, not authority.',
  },
  claude: {
    label: 'Claude', model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
    kind: 'anthropic', url: process.env.NOVA_CHAT_URL_ANTHROPIC || 'https://api.anthropic.com/v1/messages',
    envKey: 'ANTHROPIC_API_KEY',
    role: 'You are Claude, NOVA careful reviewer. Be precise, link evidence to project memory, and name risks plainly.',
  },
  gemini: {
    label: 'Gemini', model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    kind: 'google', url: process.env.NOVA_CHAT_URL_GOOGLE || 'https://generativelanguage.googleapis.com/v1beta/models',
    envKey: 'GOOGLE_AI_KEY', fileKey: { file: 'gemini-connector-3000/.env', name: 'GOOGLE_AI_KEY' },
    role: 'You are Gemini, NOVA high-context architecture auditor. Synthesize broadly from project memory and flag inconsistencies.',
  },
};

const IMAGE_URL = process.env.NOVA_IMAGE_URL || `${META_BASE}/images/generations`;
const IMAGE_MODEL = 'muse-image-1.0';

// Read one KEY=value from a connector .env (values never logged by callers).
function readEnvFile(contextDir, rel, name) {
  try {
    const text = fs.readFileSync(path.join(contextDir, rel), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && m[1] === name && m[2]) return m[2].trim();
    }
  } catch { /* missing file => no key */ }
  return null;
}

function resolveKey(providerId, transient, contextDir) {
  if (transient && transient.length >= 4) return { key: transient, source: 'browser' };
  const p = PROVIDERS[providerId];
  if (process.env[p.envKey]) return { key: process.env[p.envKey], source: 'server-env' };
  if (p.fileKey && contextDir) {
    const v = readEnvFile(contextDir, p.fileKey.file, p.fileKey.name);
    if (v) return { key: v, source: 'server-file' };
  }
  return { key: null, source: 'none' };
}

async function postJson(url, headers, body, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally { clearTimeout(to); }
}

async function chatOnce(providerId, { message, system, key }) {
  const p = PROVIDERS[providerId];
  const started = Date.now();
  const fail = (error) => ({ provider: providerId, label: p.label, model: p.model, ok: false, error, latencyMs: Date.now() - started });
  try {
    if (p.kind === 'openai-chat') {
      const messages = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: message });
      const r = await postJson(p.url, { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        { model: p.model, messages, temperature: 0.5, max_tokens: p.maxTokens || 1200 });
      if (!r.ok) return fail(`HTTP ${r.status}: ${r.text.slice(0, 300)}`);
      const d = JSON.parse(r.text);
      return { provider: providerId, label: p.label, model: d.model || p.model, ok: true, reply: d.choices?.[0]?.message?.content || '(empty)', latencyMs: Date.now() - started };
    }
    if (p.kind === 'anthropic') {
      const body = { model: p.model, max_tokens: p.maxTokens || 1200, messages: [{ role: 'user', content: message }] };
      if (system) body.system = system;
      const r = await postJson(p.url, { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body);
      if (!r.ok) return fail(`HTTP ${r.status}: ${r.text.slice(0, 300)}`);
      const d = JSON.parse(r.text);
      return { provider: providerId, label: p.label, model: d.model || p.model, ok: true, reply: (d.content || []).map((c) => c.text || '').join('\n') || '(empty)', latencyMs: Date.now() - started };
    }
    if (p.kind === 'google') {
      const r = await postJson(`${p.url}/${p.model}:generateContent?key=${encodeURIComponent(key)}`, { 'Content-Type': 'application/json' },
        { contents: [{ parts: [{ text: (system ? system + '\n\n' : '') + message }] }] });
      if (!r.ok) return fail(`HTTP ${r.status}: ${r.text.slice(0, 300)}`);
      const d = JSON.parse(r.text);
      const parts = d.candidates?.[0]?.content?.parts || [];
      return { provider: providerId, label: p.label, model: p.model, ok: true, reply: parts.map((x) => x.text || '').join('\n') || '(empty)', latencyMs: Date.now() - started };
    }
    return fail('unknown provider kind');
  } catch (e) {
    return fail('unreachable: ' + String((e && e.message) || e).slice(0, 200));
  }
}

function createChat({ contextDir, memory }) {
  return {
    providers() {
      return Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, model: p.model, kind: p.kind }));
    },
    async fanOut({ message, providers, keys = {}, memoryBudget = 4000, timeoutMs = 60000 }) {
      const ids = [...new Set(providers)].filter((id) => PROVIDERS[id]);
      if (typeof message !== 'string' || !message.trim() || message.length > 8000) {
        return { error: 'message: 1..8000 chars', code: 400 };
      }
      if (!ids.length || ids.length > 8) return { error: 'providers: 1..8 known ids', code: 400 };
      const mem = memory.context(memoryBudget);
      const results = await Promise.all(ids.map(async (id) => {
        const { key, source } = resolveKey(id, keys[id], contextDir);
        if (!key) return { provider: id, label: PROVIDERS[id].label, model: PROVIDERS[id].model, ok: false, error: 'no key (add in V6 or server .env)', latencyMs: 0 };
        const r = await chatOnce(id, { message, system: `${PROVIDERS[id].role}\n\n${mem.system}`, key });
        r.keySource = source;
        return r;
      }));
      return { results, memory: { chars: mem.totalChars, used: mem.used, truncated: mem.truncated } };
    },
    async image({ prompt, key }) {
      if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 1000) {
        return { error: 'prompt: 1..1000 chars', code: 400 };
      }
      const k = (key && key.length >= 4 ? key : process.env.META_API_KEY) || null;
      if (!k) return { error: 'no key (add Meta key in V6 or server .env)', code: 400 };
      const started = Date.now();
      try {
        const r = await postJson(IMAGE_URL, { Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' },
          { model: IMAGE_MODEL, prompt: prompt.trim(), size: '512x512' }, 120000);
        if (!r.ok) return { error: `HTTP ${r.status}: ${r.text.slice(0, 300)}`, code: 502 };
        const d = JSON.parse(r.text);
        const b64 = d.data?.[0]?.b64_json;
        if (!b64) return { error: 'no image in response', code: 502 };
        return { ok: true, b64, mime: 'image/webp', latencyMs: Date.now() - started };
      } catch (e) {
        return { error: 'unreachable: ' + String((e && e.message) || e).slice(0, 200), code: 502 };
      }
    },
  };
}

module.exports = { createChat, PROVIDERS };
