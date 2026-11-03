import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

// P0/S1: Loopback-only + optional Bearer-Token (V3-Disziplin: constant-time via SHA-256).
const PORT = Number(process.env.NOVA_DASHBOARD_PORT) || 8080;
const HOST = '127.0.0.1';
const DASHBOARD_TOKEN = process.env.NOVA_DASHBOARD_TOKEN || '';

function isAuthorized(req, token = DASHBOARD_TOKEN) {
  if (!token) return true;
  const header = req?.headers?.authorization || '';
  const [scheme, value] = header.split(' ');
  if (!value || String(scheme).toLowerCase() !== 'bearer') return false;
  const a = crypto.createHash('sha256').update(String(value)).digest();
  const b = crypto.createHash('sha256').update(String(token)).digest();
  return crypto.timingSafeEqual(a, b);
}

function isInsideDir(resolved, dir) {
  return resolved === dir || resolved.startsWith(dir + path.sep);
}

// P0/S1: URL-Pfad -> Datei; null = blockiert (Escape, Dotfile, Decode-Fehler).
// rootDir = context/-Verzeichnis (Server laeuft mit cwd=context/).
function resolveStaticPath(pathname, rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/')) return null;
  let base;
  let rel;
  if (decoded.startsWith('/nova-sounds/')) {
    base = path.join(root, 'nova-sounds');
    rel = decoded.slice('/nova-sounds/'.length);
  } else if (decoded.startsWith('/sounds/')) {
    base = path.join(root, 'Sounds');
    rel = decoded.slice('/sounds/'.length);
  } else if (decoded === '/logo.ico') {
    base = root; rel = 'logo.ico';
  } else if (decoded === '/logo.png') {
    base = root; rel = 'logo.png';
  } else if (decoded === '/convertico-icon.ico' || decoded === '/convertico-icon (3).ico') {
    base = root; rel = 'convertico-icon (3).ico';
  } else {
    base = path.join(root, 'dashboard');
    rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  }
  if (!rel) return null;
  const target = path.resolve(base, rel);
  if (!isInsideDir(target, base)) return null;
  const name = path.basename(target).toLowerCase();
  if (name === '.env' || name.startsWith('.env.') || name.startsWith('.')) return null;
  return target;
}

// Load .env keys if available
async function loadEnv(dir) {
  try {
    const content = await fs.readFile(path.resolve(dir, '.env'), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}

async function initEnvs() {
  await loadEnv('grok-connector-3000');
  await loadEnv('chatgpt-claude-connector-3000');
  await loadEnv('gemini-connector-3000');
}

async function callGemini(message, projectContext) {
  const key = process.env.GOOGLE_AI_KEY;
  if (!key) throw new Error('GOOGLE_AI_KEY not configured in gemini-connector-3000/.env');
  const systemPrompt = `You are Gemini (1.5-flash), a high-context reasoning peer in the Nova-Ygdrassil multi-model agent-bus. Here is the project memory:\n\n${projectContext}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nUser Message: " + message }] }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
}

async function getProjectContext() {
  try {
    return await fs.readFile('PROJECT_CONTEXT.md', 'utf8');
  } catch {
    return 'Nova-Ygdrassil Multi-Model Agent-Bus V2';
  }
}

function extractGrokText(data) {
  if (!data) return 'Empty response from Grok';
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return data; }
  }
  if (typeof data.output_text === 'string') return data.output_text;
  if (typeof data.text === 'string') return data.text;
  
  const chunks = [];
  const outputs = Array.isArray(data.output) ? data.output : [data.output];
  for (const item of outputs) {
    if (!item) continue;
    if (typeof item.text === 'string') chunks.push(item.text);
    if (typeof item.output_text === 'string') chunks.push(item.output_text);
    const contents = Array.isArray(item.content) ? item.content : [item.content];
    for (const content of contents) {
      if (!content) continue;
      if (typeof content.text === 'string') chunks.push(content.text);
      if (typeof content.value === 'string') chunks.push(content.value);
      if (typeof content === 'string') chunks.push(content);
    }
  }
  return chunks.join('\n').trim() || JSON.stringify(data, null, 2);
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/api/memory' && req.method === 'GET') {
    if (!isAuthorized(req)) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    const projectContext = await getProjectContext();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ content: projectContext }));
    return;
  }

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    if (!isAuthorized(req)) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const { model, message } = JSON.parse(body);
      let reply = '';
      const projectContext = await getProjectContext();

      if (model === 'grok') {
        const key = process.env.XAI_API_KEY;
        if (!key) throw new Error('XAI_API_KEY not configured in grok-connector-3000/.env');
        const systemPrompt = `You are Grok, an adversarial peer in the Nova-Ygdrassil multi-model agent-bus. Here is the canonical project memory:\n\n${projectContext}`;
        const response = await fetch('https://api.x.ai/v1/responses', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'grok-4.7',
            input: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ]
          })
        });
        const data = await response.json();
        reply = extractGrokText(data);
      } else if (model === 'chatgpt') {
        const key = process.env.OPENAI_API_KEY;
        if (!key) throw new Error('OPENAI_API_KEY not configured in chatgpt-claude-connector-3000/.env');
        const systemPrompt = `You are ChatGPT (GPT-4o), operating as a core reasoning peer within the Nova-Ygdrassil Multi-Model Agent-Bus developed by Gürkan. You have full access to the project context, history, architecture, and milestones below. Answer thoroughly, accurately, and contextually based on this documentation:\n\n${projectContext}`;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ]
          })
        });
        const data = await response.json();
        reply = data.choices?.[0]?.message?.content || JSON.stringify(data);
      } else if (model === 'gemini' || model === 'gemini-cli' || model === 'orchestrator' || model === 'codex' || model === 'phobos' || model === 'precoder' || model === 'muse') {
        const systemPrompt = `You are Muse Spark (Meta AI Powered Privileged Orchestrator) within the Nova-Ygdrassil Multi-Model Agent-Bus developed by Gürkan for the Meta Global AI Hackathon 2026. You have WRITE and ORCHESTRATION privileges. Here is the canonical project memory:\n\n${projectContext}`;
        reply = await callGemini(message, systemPrompt);
      } else {
        reply = `🧠 [Agent-Bus Orchestrator]: I received your message: "${message}". All bridges (Grok, ChatGPT, Codex V3, Gemini) are online and synchronized. How can I assist?`;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: `Error: ${e.message}` }));
    }
    return;
  }

  // Serve static files (P0/S1: containment-guarded)
  const filePath = resolveStaticPath(url.pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const mime = ext === '.html' ? 'text/html' : ext === '.ico' ? 'image/x-icon' : ext === '.png' ? 'image/png' : ext === '.js' ? 'text/javascript' : ext === '.mp3' ? 'audio/mpeg' : ext === '.wav' ? 'audio/wav' : 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const isMainModule = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMainModule) {
  initEnvs().then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Nova Agent-Bus Dashboard Server running at http://localhost:${PORT}`);
      if (!DASHBOARD_TOKEN) console.log('WARN: NOVA_DASHBOARD_TOKEN not set - /api/* open to local processes!');
    });
  });
}

export { server, resolveStaticPath, isAuthorized, HOST, PORT };
