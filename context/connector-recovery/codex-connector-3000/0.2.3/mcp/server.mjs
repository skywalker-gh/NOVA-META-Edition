#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';

const DEFAULT_ROOT = process.env.NOVA_PROJECT_ROOT || process.cwd();
// Prefer the executable found on PATH. `codex.cmd` cannot be spawned with
// shell:false on Windows, while `codex` resolves to the installed codex.exe.
const CODEX_BIN = process.env.CODEX_BIN || 'codex';
const AGENT_IDENTITY = 'codex-local';
const sessions = new Map();

function send(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function error(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

const tools = [
  {
    name: 'codex_project_status',
    description: 'Read-only inspection of a project through the local Codex CLI. Reports the actual project path, Git status, structure, relevant files, technologies, missing/running components, risks, and confirms no changes are requested.',
    inputSchema: {
      type: 'object',
      properties: {
        project_root: { type: 'string', description: 'Project directory. Defaults to NOVA_PROJECT_ROOT and must remain inside the host-allowed root.' }
      }
    }
  },
  {
    name: 'codex_ask',
    description: 'Send a concrete analysis/review task to the local Codex CLI. Read-only is the default.',
    inputSchema: {
      type: 'object',
      properties: {
        project_root: { type: 'string', description: 'Project directory. Defaults to NOVA_PROJECT_ROOT.' },
        task: { type: 'string', description: 'Complete analysis or review task.' },
        read_only: { type: 'boolean', default: true, description: 'Keep the Codex run read-only. Defaults to true.' },
        session_id: { type: 'string', description: 'Optional Codex session/thread ID returned by a previous call.' },
        timeout_seconds: { type: 'integer', minimum: 10, maximum: 3600, description: 'Maximum execution time.' }
      },
      required: ['task']
    }
  },
  {
    name: 'codex_implement',
    description: 'Send an explicit implementation task to local Codex. Uses the workspace-write sandbox and asks Codex to verify relevant tests; host/Codex policy remains authoritative.',
    inputSchema: {
      type: 'object',
      properties: {
        project_root: { type: 'string', description: 'Project directory. Defaults to NOVA_PROJECT_ROOT.' },
        task: { type: 'string', description: 'Concrete implementation task and acceptance criteria.' },
        session_id: { type: 'string', description: 'Optional Codex session/thread ID returned by a previous call.' },
        approval_mode: { type: 'string', enum: ['default', 'never'], default: 'default', description: 'Codex approval policy requested for this non-interactive run. The host may constrain it; it never bypasses host policy.' },
        timeout_seconds: { type: 'integer', minimum: 10, maximum: 3600, description: 'Maximum execution time.' }
      },
      required: ['task']
    }
  }
];

function resolveProjectRoot(projectRoot) {
  const root = path.resolve(DEFAULT_ROOT);
  const candidate = path.resolve(projectRoot || root);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new Error(`project_root must remain inside NOVA_PROJECT_ROOT: ${candidate}`);
  }
  return candidate;
}

function redactSecrets(value) {
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) return value.map(redactSecrets);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactSecrets(v)]));
  }
  if (!value) return value;
  return value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, '[REDACTED_SECRET_BLOCK]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|sk-proj-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xai-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16})\b/g, '[REDACTED_SECRET]')
    .replace(/([A-Za-z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Za-z0-9_]*\s*[=:]\s*)[^\s,}"']+/gi, '$1[REDACTED_SECRET]');
}

function parseJsonLines(stdout) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* preserve unparseable output separately */ }
  }
  return events;
}

function extractThreadId(events) {
  for (const event of events) {
    if (event?.type === 'thread.started' && typeof event.thread_id === 'string') return event.thread_id;
    if (typeof event?.thread_id === 'string') return event.thread_id;
    if (typeof event?.conversation_id === 'string') return event.conversation_id;
  }
  return null;
}

function extractFinalMessage(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.type === 'item.completed' && e.item?.type === 'agent_message') {
      return e.item.text || e.item.content || null;
    }
    if (e?.type === 'message.completed' && typeof e.message === 'string') return e.message;
  }
  return null;
}

function rememberSession(threadId, projectRoot, sandbox) {
  if (!threadId) return null;
  sessions.set(threadId, {
    session_id: threadId,
    project_root: projectRoot,
    agent_identity: AGENT_IDENTITY,
    sandbox,
    updated_at: new Date().toISOString()
  });
  return sessions.get(threadId);
}

function validateSession(sessionId, projectRoot) {
  if (!sessionId) return;
  const known = sessions.get(sessionId);
  if (known && path.resolve(known.project_root) !== path.resolve(projectRoot)) {
    throw new Error(`session_id belongs to a different project_root: ${known.project_root}`);
  }
}

function runCodex({ task, projectRoot, sessionId, sandbox, approvalMode = 'default', timeoutSeconds = 900 }) {
  return new Promise((resolve, reject) => {
    validateSession(sessionId, projectRoot);
    const args = ['exec'];
    if (sessionId) {
      args.push('resume', sessionId, '--json');
      args.push('-c', `sandbox_mode="${sandbox}"`);
      if (approvalMode === 'never') args.push('-c', 'approval_policy="never"');
    } else {
      args.push('--json', '--sandbox', sandbox);
      if (approvalMode === 'never') args.push('-c', 'approval_policy="never"');
    }
    args.push(task);

    const child = spawn(CODEX_BIN, args, { cwd: projectRoot, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Codex timed out after ${timeoutSeconds}s`));
    }, timeoutSeconds * 1000);

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const events = parseJsonLines(stdout);
      const threadId = extractThreadId(events) || sessionId || null;
      const session = rememberSession(threadId, projectRoot, sandbox);
      resolve({
        exit_code: code,
        signal,
        project_root: projectRoot,
        agent_identity: AGENT_IDENTITY,
        session: session || (sessionId ? { session_id: sessionId, project_root: projectRoot, agent_identity: AGENT_IDENTITY, sandbox }  : null),
        final_message: redactSecrets(extractFinalMessage(events)),
        events: events.map(redactSecrets),
        raw_stdout: redactSecrets(stdout),
        raw_stderr: redactSecrets(stderr),
        command: CODEX_BIN,
        args: ['exec', ...(sessionId ? ['resume', sessionId, '--json'] : ['--json', '--sandbox', sandbox]), ...(approvalMode === 'never' ? ['-c', 'approval_policy="never"'] : []), '<prompt-redacted>']
      });
    });
  });
}

async function handleTool(name, args) {
  if (name === 'codex_project_status') {
    const projectRoot = resolveProjectRoot(args.project_root);
    const task = `Perform a READ-ONLY project status inspection. Do not modify files. Report exactly: actual project path; Git status; project structure; relevant files; detected technologies; running and missing components; risks/blockers; and explicitly confirm that no changes were made.`;
    return { content: [{ type: 'text', text: JSON.stringify(await runCodex({ task, projectRoot, sandbox: 'read-only', timeoutSeconds: 300 }), null, 2) }] };
  }
  if (name === 'codex_ask') {
    const projectRoot = resolveProjectRoot(args.project_root);
    const readOnly = args.read_only !== false;
    if (!readOnly) {
      throw new Error('codex_ask is analysis-only by design. Use codex_implement for explicit write operations.');
    }
    return { content: [{ type: 'text', text: JSON.stringify(await runCodex({ task: args.task, projectRoot, sessionId: args.session_id, sandbox: 'read-only', timeoutSeconds: args.timeout_seconds || 900 }), null, 2) }] };
  }
  if (name === 'codex_implement') {
    const projectRoot = resolveProjectRoot(args.project_root);
    const task = `Implement the following task. Inspect the existing architecture first and make the smallest coherent changes. After changes, run relevant tests or verification commands. Return: changed files; implementation summary; tests run and exact results; remaining risks; and any blocked/unverified items. Do not claim success without verification.\n\nTASK:\n${args.task}`;
    return { content: [{ type: 'text', text: JSON.stringify(await runCodex({ task, projectRoot, sessionId: args.session_id, sandbox: 'workspace-write', approvalMode: args.approval_mode || 'default', timeoutSeconds: args.timeout_seconds || 1200 }), null, 2) }] };
  }
  throw new Error(`Unknown tool: ${name}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async chunk => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === 'initialize') {
      send(msg.id, { protocolVersion: msg.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'codex_connector_3000', version: '0.2.3' } });
    } else if (msg.method === 'notifications/initialized') {
    } else if (msg.method === 'tools/list') {
      send(msg.id, { tools });
    } else if (msg.method === 'tools/call') {
      try { send(msg.id, await handleTool(msg.params?.name, msg.params?.arguments || {})); }
      catch (e) { error(msg.id, -32000, e?.message || String(e)); }
    } else if (msg.id !== undefined) {
      error(msg.id, -32601, `Method not found: ${msg.method}`);
    }
  }
});
