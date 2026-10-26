import { spawn } from 'node:child_process';
import { resolveProjectPath } from './project-root.js';

const MAX_OUTPUT = 4 * 1024 * 1024;

export async function runCodexJob(job, config, { signal } = {}) {
  if (signal?.aborted) throw new CodexRunError('cancelled', true);
  await resolveProjectPath(config.projectRoot, '.');
  const tool = job.tool;
  const readOnly = tool !== 'codex_implement';
  const timeoutMs = Math.min(3600, Math.max(10, Number(job.payload?.timeout_seconds) || 300)) * 1000;
  let prompt;
  if (tool === 'codex_project_status') {
    prompt = 'Inspect this project without making any changes. Report the actual project path, Git status if available, top-level structure, relevant files and technologies, running or missing components, and risks. Clearly confirm that you made no changes.';
  } else if (tool === 'codex_ask') {
    prompt = `Read-only request. Do not modify files or run commands that write data. Answer the user's request directly.\n\nUser request:\n${job.payload.prompt}`;
  } else {
    prompt = `Implement only the user's explicit request. Inspect the relevant code first, make the smallest safe change, preserve existing architecture, and verify the relevant behavior. Do not access files outside the configured project root.\n\nUser request:\n${job.payload.prompt}`;
  }

  const args = buildCodexArgs(job, config.projectRoot, prompt, readOnly);
  const result = await spawnCodex(config.codexBin, args, { cwd: config.projectRoot, timeoutMs, signal });
  const parsed = parseCodexOutput(result.stdout);
  if (result.code !== 0 || !parsed.text) {
    throw new CodexRunError(result.error || (result.code === null ? 'timeout' : 'codex_failed'));
  }
  const safeText = redactSecrets(parsed.text);
  if (Buffer.byteLength(safeText) > 300_000) throw new CodexRunError('output_limit');
  const sessionId = parsed.sessionId || job.session_id || null;
  return {
    content: [{ type: 'text', text: safeText }],
    structuredContent: {
      status: 'completed', success: true, summary: safeText, project_root: config.projectRoot,
      session_id: sessionId, errors: [], changed_files: [], tests: [],
      ...(job.tool === 'codex_implement' ? { verification: 'Codex-reported; not independently audited' } : {}),
      provenance: { source: 'chatgpt-mcp', executor: 'local-codex-cli', tool: job.tool, job_id: job.id }
    }
  };
}

export function buildCodexArgs(job, projectRoot, prompt, readOnly = job.tool !== 'codex_implement') {
  if (job.session_id) return ['exec', 'resume', '--json', '--skip-git-repo-check', '-c', `sandbox_mode="${readOnly ? 'read-only' : 'workspace-write'}"`, job.session_id, prompt];
  return ['exec', '--sandbox', readOnly ? 'read-only' : 'workspace-write', '--cd', projectRoot, '--json', '--skip-git-repo-check', prompt];
}

export function redactSecrets(text) {
  return text
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,})\b/g, '[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/gi, 'Bearer [REDACTED]')
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
}

export class CodexRunError extends Error {
  constructor(code, indeterminate = false) { super('Codex execution failed.'); this.name = 'CodexRunError'; this.code = code; this.indeterminate = indeterminate; }
}

export function spawnCodex(binary, args, { cwd, timeoutMs, signal }) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderrBytes = 0;
    let failure = null;
    let overflow = false;
    let killTimer;
    const finish = value => { clearTimeout(timer); clearTimeout(killTimer); signal?.removeEventListener('abort', onAbort); resolve(value); };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > MAX_OUTPUT) {
        overflow = true;
        failure = 'output_limit';
        killProcessTree(child);
      }
    });
    child.stderr.on('data', chunk => { stderrBytes += Buffer.byteLength(chunk); });
    child.once('error', () => finish({ code: 1, stdout: '', error: failure || 'spawn_failed' }));
    child.once('close', code => finish({ code, stdout: overflow ? '' : stdout, stderrBytes, error: failure }));
    const terminate = code => {
      if (failure) return;
      failure = code;
      killProcessTree(child);
      killTimer = setTimeout(() => child.kill('SIGKILL'), 10_000);
      killTimer.unref?.();
    };
    const onAbort = () => terminate('cancelled');
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => terminate('timeout'), timeoutMs);
    timer.unref?.();
    if (signal?.aborted) onAbort();
  });
}

function killProcessTree(child) {
  if (!child.pid) return child.kill();
  if (process.platform !== 'win32') return child.kill('SIGKILL');
  const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore' });
  killer.once('error', () => child.kill());
}

export function parseCodexOutput(stdout) {
  let sessionId = null;
  let text = '';
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === 'thread.started' && typeof event.thread_id === 'string') sessionId = event.thread_id;
      if (event.type === 'item.completed' && event.item?.type === 'agent_message' && typeof event.item.text === 'string') text = event.item.text;
      if (event.type === 'turn.completed' && typeof event.session_id === 'string') sessionId = event.session_id;
    } catch { /* Ignore non-JSON diagnostic lines; never return stderr or raw output. */ }
  }
  return { sessionId, text };
}
