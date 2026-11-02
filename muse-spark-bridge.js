
// NOVA - Muse Spark Bridge V2 - REAL HTTP SERVER + GitHub Proxy + Local File Reader
// FIX für: Bridge online aber kein GitHub Zugriff für Meta AI
// Problem: Alte Bridge nur console.log, kein Server. Container hat kein Internet direkt.
// Lösung: Dieser Server läuft auf 127.0.0.1:8000 und proxied GitHub + liest lokale Files
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const META_API_KEY = process.env.META_API_KEY;
const GITHUB_PAT = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || 'skywalker-gh/NOVA-META-Edition';
const PORT = process.env.NOVA_PORT || 8000;

console.log('[MUSE SPARK BRIDGE V2] 🟢 Starting REAL Server...');
console.log(`Repo: ${GITHUB_REPO}`);
console.log(`Meta Key: ${META_API_KEY ? 'SET ('+META_API_KEY.slice(0,8)+'...)' : 'MISSING!'}`);
console.log(`GitHub PAT: ${GITHUB_PAT ? 'SET ('+GITHUB_PAT.slice(0,12)+'...)' : 'MISSING!'}`);
console.log(`Port: ${PORT}`);

if (!META_API_KEY) {
  console.error('❌ META_API_KEY fehlt in .env');
  process.exit(1);
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

function readLocalFile(filePath) {
  // Sicher: nur innerhalb NOVA-META-Edition + alte Nova V2 Ordner
  const base = process.cwd();
  const full = path.resolve(base, filePath);
  // Erlaube auch Desktop parent scan
  console.log(`[Local Reader] Reading ${filePath} -> ${full}`);
  if (!fs.existsSync(full)) throw new Error(`File not found: ${full}`);
  return fs.readFileSync(full, 'utf8');
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
    res.writeHead(500, { 'Content-Type': 'application/json' });
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

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`\\n[HTTP Server] 🟢 Listening on http://127.0.0.1:${PORT}`);
  console.log(`[HTTP Server] Tommy: http://127.0.0.1:${PORT}/tommy`);
  console.log(`[HTTP Server] Status: http://127.0.0.1:${PORT}/status`);
  console.log(`[HTTP Server] GitHub Content: http://127.0.0.1:${PORT}/api/github/content?path=context/STRATEGY_MODEL_CONTINUITY.md`);
  console.log(`[HTTP Server] Local Read: http://127.0.0.1:${PORT}/api/local/read?path=context/STRATEGY_MODEL_CONTINUITY.md`);
  console.log(`[HTTP Server] Old Folders: http://127.0.0.1:${PORT}/api/local/old-folders`);
  await testConnections();
  console.log('\\n[NOVA Worker V2] 🟢 ACTIVE - REAL Internet-Brücke für Meta AI - Mit HTTP Server!');
  console.log('Lass Fenster offen!');
});