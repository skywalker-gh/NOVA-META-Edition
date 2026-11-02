// NOVA content memory index: unified project context for all providers.
// Pure CJS module, no side effects. Sources: context docs + recent tasks/approvals.
const fs = require('fs');
const path = require('path');

const DOCS = [
  { id: 'project-context', rel: 'PROJECT_CONTEXT.md' },
  { id: 'models-consensus', rel: 'ecosystem-memory/models-consensus.md' },
  { id: 'agent-bus-state', rel: 'ecosystem-memory/agent-bus-state.md' },
  { id: 'user-profile', rel: 'ecosystem-memory/user-profile.md' },
];

function readIf(pathname, maxChars) {
  try {
    const st = fs.statSync(pathname);
    if (!st.isFile()) return null;
    return { text: fs.readFileSync(pathname, 'utf8').slice(0, maxChars), mtimeMs: st.mtimeMs, chars: Math.min(st.size, maxChars) };
  } catch { return null; }
}

function tasksDigest(tasksDir, limit = 5) {
  try {
    const files = fs.readdirSync(tasksDir).filter((f) => f.startsWith('t') && f.endsWith('.json'));
    const tasks = files
      .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(tasksDir, f), 'utf8')); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, limit);
    if (!tasks.length) return null;
    return tasks.map((t) => `- ${t.id} [${t.status}${t.outcome ? '/' + t.outcome : ''}] ${String(t.goal || '').slice(0, 120)}`).join('\n');
  } catch { return null; }
}

function approvalsDigest(tasksDir, limit = 5) {
  try {
    const a = JSON.parse(fs.readFileSync(path.join(tasksDir, 'approvals.json'), 'utf8'));
    if (!Array.isArray(a) || !a.length) return null;
    return a.slice(0, limit).map((x) => `- ${x.id} [${x.status}${x.decision ? '/' + x.decision : ''}] task=${x.taskId} by=${x.decidedBy || '-'}`).join('\n');
  } catch { return null; }
}

function collectSources({ contextDir, tasksDir }) {
  const out = [];
  for (const d of DOCS) {
    const hit = readIf(path.join(contextDir, d.rel), 12000);
    if (hit) out.push({ id: d.id, path: d.rel, ...hit });
  }
  const td = tasksDigest(tasksDir);
  if (td) out.push({ id: 'recent-tasks', path: '(tasks/)', text: td, mtimeMs: Date.now(), chars: td.length });
  const ad = approvalsDigest(tasksDir);
  if (ad) out.push({ id: 'recent-approvals', path: '(approvals)', text: ad, mtimeMs: Date.now(), chars: ad.length });
  return out;
}

// Assemble budgeted system context. Priority = source order; later sources drop first.
function buildContext(sources, budget = 6000) {
  const used = [];
  const truncated = [];
  let remaining = Math.max(500, budget);
  const parts = ['# NOVA Memory (unified project context)'];
  for (const s of sources) {
    if (remaining <= 100) { truncated.push(s.id); continue; }
    const head = `\n\n## ${s.id}\n`;
    const room = remaining - head.length;
    if (room <= 100) { truncated.push(s.id); continue; }
    const body = s.text.length > room ? s.text.slice(0, room) + '\n…[cut]' : s.text;
    if (s.text.length > room) truncated.push(s.id + ' (cut)');
    parts.push(head + body);
    used.push({ id: s.id, chars: head.length + body.length });
    remaining -= head.length + body.length;
  }
  const system = parts.join('');
  return { system, used, truncated, totalChars: system.length };
}

function createMemory({ contextDir, tasksDir }) {
  return {
    index() {
      const sources = collectSources({ contextDir, tasksDir });
      return {
        at: new Date().toISOString(),
        sources: sources.map((s) => ({ id: s.id, path: s.path, chars: s.chars, mtimeMs: s.mtimeMs })),
        totalChars: sources.reduce((n, s) => n + s.chars, 0),
      };
    },
    context(budget) {
      const sources = collectSources({ contextDir, tasksDir });
      return { at: new Date().toISOString(), ...buildContext(sources, budget) };
    },
  };
}

module.exports = { createMemory, collectSources, buildContext };
