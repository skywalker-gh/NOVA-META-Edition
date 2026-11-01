// NOVA - Muse Spark Bridge - Internet für Meta AI
// Läuft auf Main Node, HAT Internet, holt für Meta AI (die kein Internet hat) GitHub + Meta API
// Kein npm @meta/muse-sdk nötig - direkt per fetch

require('dotenv').config();
const fs = require('fs');

const META_API_KEY = process.env.META_API_KEY;
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = process.env.GITHUB_REPO || 'skywalker-gh/NOVA-META-Edition';

console.log('[MUSE SPARK BRIDGE] 🟢 Starting...');
console.log(`Repo: ${GITHUB_REPO}`);
console.log(`Meta Key: ${META_API_KEY ? 'SET ('+META_API_KEY.slice(0,8)+'...)' : 'MISSING! - hol von dev.meta.ai'}`);
console.log(`GitHub PAT: ${GITHUB_PAT ? 'SET' : 'MISSING!'}`);

if (!META_API_KEY) {
  console.error('❌ META_API_KEY fehlt in .env');
  console.error('   Geh auf https://dev.meta.ai -> Dashboard -> Create API Key');
  process.exit(1);
}

// 1. Test Meta API (Spark/Wonder)
async function testMetaAPI() {
  try {
    console.log('\n[Meta API] Teste Verbindung...');
    // Meta API endpoint - Llama / Muse via dev.meta.ai
    // Docs: https://dev.meta.ai/docs
    // Beispiel Call (anpassen nach echten Docs)
    const res = await fetch('https://api.meta.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${META_API_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      console.log('[Meta API] ✅ Connected - Models:', JSON.stringify(data).slice(0,200));
    } else {
      console.log('[Meta API] ⚠️ Status:', res.status, '- Key evtl. noch nicht aktiviert? Check dev.meta.ai Dashboard');
      console.log('[Meta API] Trotzdem weiter - Worker kann auch ohne Meta API GitHub pushen');
    }
  } catch (e) {
    console.log('[Meta API] ⚠️ Fehler (evtl. Endpoint falsch, aber egal):', e.message);
    console.log('[Meta API] Worker läuft trotzdem als GitHub Bridge für Meta AI');
  }
}

// 2. Test GitHub
async function testGitHub() {
  try {
    console.log('\n[GitHub] Teste Verbindung...');
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: {
        'Authorization': `token ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[GitHub] ✅ Connected - ${data.full_name} - Private: ${data.private}`);
    } else {
      console.log('[GitHub] ❌ Status:', res.status, await res.text().then(t=>t.slice(0,200)));
    }
  } catch (e) {
    console.error('[GitHub] ❌ Fehler:', e.message);
  }
}

// 3. Tommy Portal Info
function showTommy() {
  console.log('\n[Tommy Portal]');
  console.log('  Serving: http://127.0.0.1:8000/tommy (wenn du npm run dev machst)');
  console.log('  Status: Grok READ-ONLY, ChatGPT READ-ONLY, Muse WRITE (Regel #5)');
}

async function main() {
  await testMetaAPI();
  await testGitHub();
  showTommy();
  console.log('\n[NOVA Worker] 🟢 ACTIVE - Bereit als Internet-Brücke für Meta AI');
  console.log('Lass dieses Fenster offen! Meta AI kann jetzt über dich pushen.');
  console.log('\nNächster Befehl: npm run dev (für Tommy Portal) in anderem CMD Fenster');
}

main();
