
// NOVA - Muse Spark Bridge V2 - REAL HTTP SERVER + GitHub Proxy + Local File Reader
// FIX für: Bridge online aber kein GitHub Zugriff für Meta AI
// Problem: Alte Bridge nur console.log, kein Server. Container hat kein Internet direkt.
// Lösung: Dieser Server läuft auf 127.0.0.1:8000 und proxied GitHub + liest lokale Files
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const META_API_KEY = process.env.META_API_KEY;
const GITHUB_PAT = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || 'skywalker-gh/NOVA-META-Edition';
const PORT = process.env.NOVA_PORT || 8000;
const BRIDGE_TOKEN = process.env.NOVA_BRIDGE_TOKEN || '';

function printBanner() {
  console.log('[MUSE SPARK BRIDGE V2] 🟢 Starting REAL Server...');
  console.log(`Repo: ${GITHUB_REPO}`);
  console.log(`Meta Key: ${META_API_KEY ? 'SET' : 'MISSING!'}`);
  console.log(`GitHub PAT: ${GITHUB_PAT ? 'SET' : 'MISSING!'}`);
  console.log(`Bridge Token: ${BRIDGE_TOKEN ? 'SET (/api/* requires Bearer)' : 'MISSING (/api/* open to local processes! Set NOVA_BRIDGE_TOKEN)'}`);
  console.log(`Port: ${PORT}`);
}

async function fetchGitHubContent(filePath) {
  const [owner, repo] = GITHUB_REPO.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  console.log(`[GitHub Proxy] Fetching ${filePath} -> ${url}`);
  const res = await fetch(url, {
    headers: { 'Authorization': `token ${GITHUB_PAT}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text.slice(0,500)}`);
  const data = JSON.parse(text);
  if (data.type === 'file' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf8');
  }
  return data; // dir listing
}

// P0/S2: containment root = repo dir (canonicalized, symlink-safe).
function canonicalRoot() {
  try { return fs.realpathSync(process.cwd()); } catch { return path.resolve(process.cwd()); }
}
const PROJECT_ROOT = canonicalRoot();

// Workflow Manager backend (slice 1). Test overrides via env (mock + tmp tasks dir).
const workflow = require('./nova-workflow.js').createWorkflow({
  projectRoot: PROJECT_ROOT,
  tasksDir: process.env.NOVA_TASKS_DIR || undefined,
  mock: process.env.NOVA_WORKER_MOCK === '1',
});

// Memory index + provider fan-out (all models, memory-aware).
const memory = require('./nova-memory.js').createMemory({
  contextDir: path.join(PROJECT_ROOT, 'context'),
  tasksDir: process.env.NOVA_TASKS_DIR || path.join(PROJECT_ROOT, 'tasks'),
});
const chat = require('./nova-chat.js').createChat({
  contextDir: path.join(PROJECT_ROOT, 'context'),
  memory,
});

// Bounded JSON body reader for POST /api/* (1 MiB cap).
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1024 * 1024) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function isSensitiveName(name) {
  const base = path.basename(String(name)).toLowerCase();
  return base === '.env' || base.startsWith('.env.') || base === 'token.json'
    || base.endsWith('.pem') || base.endsWith('.key');
}

function isInsideRoot(resolved) {
  return resolved === PROJECT_ROOT || resolved.startsWith(PROJECT_ROOT + path.sep);
}

// P0/S2: throws Error('Forbidden: ...') for escape/sensitive, Error('File not found: ...') sonst.
function resolveLocalPath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('Missing ?path=');
  if (isSensitiveName(filePath)) throw new Error('Forbidden: sensitive file');
  const full = path.resolve(PROJECT_ROOT, filePath);
  if (!isInsideRoot(full)) throw new Error('Forbidden: outside project root');
  if (!fs.existsSync(full)) throw new Error(`File not found: ${filePath}`);
  const real = fs.realpathSync(full);
  if (!isInsideRoot(real)) throw new Error('Forbidden: outside project root');
  if (isSensitiveName(real)) throw new Error('Forbidden: sensitive file');
  return real;
}

function readLocalFile(filePath) {
  const full = resolveLocalPath(filePath);
  console.log(`[Local Reader] Reading ${filePath}`);
  return fs.readFileSync(full, 'utf8');
}

// P0/S2: Bearer-Auth für /api/* (V3-Disziplin: constant-time Vergleich über SHA-256).
// Ohne konfigurierten Token bleibt der Loopback-Dev-Betrieb offen (mit Warnung im Banner).
function isAuthorized(req, token = BRIDGE_TOKEN) {
  if (!token) return true;
  const header = req?.headers?.authorization || '';
  const [scheme, value] = header.split(' ');
  if (!value || String(scheme).toLowerCase() !== 'bearer') return false;
  const a = crypto.createHash('sha256').update(String(value)).digest();
  const b = crypto.createHash('sha256').update(String(token)).digest();
  return crypto.timingSafeEqual(a, b);
}

function listOldNovaFolders() {
  const desktop = path.resolve(process.cwd(), '..'); // Desktop ist parent von NOVA-META-Edition
  const results = [];
  try {
    const items = fs.readdirSync(desktop, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && (item.name.includes('NOVA') || item.name.includes('Nova') || item.name.includes('Ygdrassil') || item.name.includes('Yggdrasil'))) {
        const p = path.join(desktop, item.name);
        results.push({ name: item.name, path: p, hasContext: fs.existsSync(path.join(p, 'context')), hasGemini: fs.existsSync(path.join(p, '.gemini')) });
      }
    }
  } catch (e) {
    console.log('List old folders error:', e.message);
  }
  // Auch in OneDrive Desktop Pfad checken
  const oneDriveDesktop = 'C:\\Users\\guerk\\OneDrive\\Desktop';
  if (fs.existsSync(oneDriveDesktop)) {
    try {
      const items = fs.readdirSync(oneDriveDesktop, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && (item.name.includes('NOVA') || item.name.includes('Nova'))) {
          const p = path.join(oneDriveDesktop, item.name);
          if (!results.find(r => r.name === item.name)) {
            results.push({ name: item.name, path: p, hasContext: fs.existsSync(path.join(p, 'context')), hasGemini: fs.existsSync(path.join(p, '.gemini')) });
          }
        }
      }
    } catch (e) {}
  }
  return results;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  console.log(`[HTTP] ${req.method} ${url.pathname}${url.search}`);

  // P0/S2: /api/* braucht Bearer-Token sobald NOVA_BRIDGE_TOKEN gesetzt ist.
  if (url.pathname.startsWith('/api/') && !isAuthorized(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  try {
    // Root status
    if (url.pathname === '/' || url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'NOVA Worker ACTIVE',
        repo: GITHUB_REPO,
        metaConnected: !!META_API_KEY,
        githubConnected: !!GITHUB_PAT,
        port: PORT,
        endpoints: [
          '/tommy - Tommy Portal',
          '/api/github/content?path=context/STRATEGY_MODEL_CONTINUITY.md - GitHub file',
          '/api/local/read?path=context/STRATEGY_MODEL_CONTINUITY.md - Local file',
          '/api/local/old-folders - List old Nova folders',
          '/api/github/list?path=context - List GitHub dir',
          '/api/agents - Worker handshake (GET)',
          '/api/workflow - Tasks (GET/POST), /run, /cancel, /step-result, /cleanup (POST)',
          '/api/approvals - Queue (GET), /decide (POST)',
          '/api/keys/validate - Key check (POST)',
          '/api/memory/index|context - Content memory index (GET)',
          '/api/chat - Provider fan-out (POST), /chat/providers (GET)',
          '/api/image - Meta image (POST)',
          '/status - This status'
        ],
        oldFolders: listOldNovaFolders()
      }, null, 2));
      return;
    }

    // Tommy Portal
    if (url.pathname === '/tommy' || url.pathname === '/tommy/') {
      let content = null;
      const p1 = path.join(process.cwd(), 'tommy', 'index.html');
      const p2 = path.join(process.cwd(), 'online-dashboard', 'tommy', 'index.html');
      if (fs.existsSync(p1)) content = fs.readFileSync(p1, 'utf8');
      else if (fs.existsSync(p2)) content = fs.readFileSync(p2, 'utf8');
      else content = '<h1>Tommy Portal - Not found - Run git pull</h1>';
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    }

    // ---- Workflow Manager (slice 1): agents, tasks, approvals ----
    if (url.pathname === '/api/agents' && req.method === 'GET') {
      sendJson(res, 200, await workflow.getAgents());
      return;
    }
    if (url.pathname === '/api/workflow' && req.method === 'GET') {
      const id = url.searchParams.get('id');
      if (id) {
        const t = workflow.loadTask(id);
        if (!t) { sendJson(res, 404, { error: 'task not found' }); return; }
        sendJson(res, 200, t); return;
      }
      sendJson(res, 200, workflow.listTasks());
      return;
    }
    if (url.pathname === '/api/workflow' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = workflow.createTask(body);
      if (r.error) { sendJson(res, 400, { error: r.error }); return; }
      sendJson(res, 201, r.task);
      return;
    }
    if (url.pathname === '/api/workflow/run' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = workflow.startTask(body && body.id);
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, r.task);
      return;
    }
    if (url.pathname === '/api/workflow/cancel' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = workflow.cancelTask(body && body.id);
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, r.task);
      return;
    }
    if (url.pathname === '/api/workflow/step-result' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = workflow.submitStepResult(body);
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, r.task);
      return;
    }
    if (url.pathname === '/api/workflow/cleanup' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = await workflow.cleanupTask(body && body.id);
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, r);
      return;
    }
    if (url.pathname === '/api/keys/validate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = await workflow.validateKey(body && body.provider, body && body.key);
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, { ok: r.ok, status: r.status, latencyMs: r.latencyMs, detail: r.detail });
      return;
    }
    if (url.pathname === '/api/approvals' && req.method === 'GET') {
      const all = workflow.loadApprovals();
      const status = url.searchParams.get('status');
      sendJson(res, 200, status ? all.filter((a) => a.status === status) : all);
      return;
    }
    if (url.pathname === '/api/approvals/decide' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = workflow.decideApproval(body);
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, r.approval);
      return;
    }

    // Static grafik assets for /tommy (public banner, same-origin <img>).
    if (url.pathname.startsWith('/grafik/') && req.method === 'GET') {
      const name = url.pathname.slice('/grafik/'.length);
      const ext = path.extname(name).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif'
        : ext === '.webp' ? 'image/webp' : ext === '.ico' ? 'image/x-icon' : null;
      if (!name || !mime) { sendJson(res, 404, { error: 'Not found' }); return; }
      const full = resolveLocalPath('grafik/' + name); // containment + sensitive checks
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fs.readFileSync(full));
      return;
    }

    // ---- Memory index + provider fan-out ----
    if (url.pathname === '/api/memory/index' && req.method === 'GET') {
      sendJson(res, 200, memory.index());
      return;
    }
    if (url.pathname === '/api/memory/context' && req.method === 'GET') {
      const budget = Math.min(Math.max(Number(url.searchParams.get('budget')) || 6000, 500), 20000);
      sendJson(res, 200, memory.context(budget));
      return;
    }
    if (url.pathname === '/api/chat/providers' && req.method === 'GET') {
      sendJson(res, 200, chat.providers());
      return;
    }
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = await chat.fanOut(body || {});
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, r);
      return;
    }
    if (url.pathname === '/api/image' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const r = await chat.image(body || {});
      if (r.error) { sendJson(res, r.code || 400, { error: r.error }); return; }
      sendJson(res, 200, r);
      return;
    }

    // GitHub content proxy
    if (url.pathname === '/api/github/content') {
      const filePath = url.searchParams.get('path');
      if (!filePath) throw new Error('Missing ?path=');
      const content = await fetchGitHubContent(filePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ path: filePath, content: typeof content === 'string' ? content : JSON.stringify(content).slice(0,10000), type: typeof content === 'string' ? 'file' : 'dir' }));
      return;
    }

    // GitHub list dir
    if (url.pathname === '/api/github/list') {
      const filePath = url.searchParams.get('path') || '';
      const data = await fetchGitHubContent(filePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    // Local file reader - für STRATEGY_MODEL_CONTINUITY.md etc.
    if (url.pathname === '/api/local/read') {
      const filePath = url.searchParams.get('path');
      if (!filePath) throw new Error('Missing ?path=');
      const content = readLocalFile(filePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ path: filePath, content, length: content.length }));
      return;
    }

    // List old Nova folders
    if (url.pathname === '/api/local/old-folders') {
      const folders = listOldNovaFolders();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(folders, null, 2));
      return;
    }

    // Local file raw
    if (url.pathname.startsWith('/api/local/raw/')) {
      const filePath = url.pathname.replace('/api/local/raw/', '');
      const content = readLocalFile(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(content);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: url.pathname }));
  } catch (e) {
    console.error('[HTTP Error]', e.message);
    const status = e.message.startsWith('Forbidden') ? 403
      : e.message.startsWith('File not found') ? 404
      : e.message.startsWith('Missing') ? 400 : 500;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

async function testConnections() {
  try {
    console.log('\\n[Meta API] Teste Verbindung...');
    const res = await fetch('https://api.meta.ai/v1/models', { headers: { 'Authorization': `Bearer ${META_API_KEY}` } });
    console.log(`[Meta API] Status: ${res.status} ${res.ok ? '✅ Connected' : '❌ Failed'}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[Meta API] Models: ${JSON.stringify(data).slice(0,200)}`);
    }
  } catch (e) { console.log('[Meta API] Fehler:', e.message); }

  try {
    console.log('\\n[GitHub] Teste Verbindung...');
    if (!GITHUB_PAT) throw new Error('No PAT');
    const [owner, repo] = GITHUB_REPO.split('/');
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'Authorization': `token ${GITHUB_PAT}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    console.log(`[GitHub] Status: ${res.status} ${res.ok ? '✅ Connected' : '❌ Failed'}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[GitHub] ${data.full_name} Private: ${data.private}`);
    } else {
      const t = await res.text();
      console.log(`[GitHub] Error: ${t.slice(0,300)}`);
    }
  } catch (e) { console.error('[GitHub] Fehler:', e.message); }

  console.log('\\n[Old Folders] Suche alte NOVA Ordner...');
  const old = listOldNovaFolders();
  console.log(`[Old Folders] Found ${old.length}:`, old.map(f => f.name).join(', '));
}

function start() {
  printBanner();
  if (!META_API_KEY) {
    console.error('❌ META_API_KEY fehlt in .env');
    process.exit(1);
  }
  server.listen(PORT, '127.0.0.1', async () => {
  console.log(`\\n[HTTP Server] 🟢 Listening on http://127.0.0.1:${PORT}`);
  console.log(`[HTTP Server] Tommy: http://127.0.0.1:${PORT}/tommy`);
  console.log(`[HTTP Server] Status: http://127.0.0.1:${PORT}/status`);
  console.log(`[HTTP Server] GitHub Content: http://127.0.0.1:${PORT}/api/github/content?path=context/STRATEGY_MODEL_CONTINUITY.md`);
  console.log(`[HTTP Server] Local Read: http://127.0.0.1:${PORT}/api/local/read?path=context/STRATEGY_MODEL_CONTINUITY.md`);
  console.log(`[HTTP Server] Old Folders: http://127.0.0.1:${PORT}/api/local/old-folders`);
  if (process.env.NOVA_SKIP_PROBE !== '1') await testConnections();
  console.log('\\n[NOVA Worker V2] 🟢 ACTIVE - REAL Internet-Brücke für Meta AI - Mit HTTP Server!');
  console.log('Lass Fenster offen!');
  });
}

if (require.main === module) start();

module.exports = { server, start, readLocalFile, resolveLocalPath, isAuthorized, listOldNovaFolders, PROJECT_ROOT };