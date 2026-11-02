// NOVA Workflow Manager backend (slice 1): tasks, local CLI worker, approvals.
// Pure CJS module: no side effects on require. Mounted by muse-spark-bridge.js.
// Design: one task at a time, sequential steps, one writer per git worktree,
// prompts ALWAYS via stdin (never on command line), checks from strict allowlist.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const MAX = { goal: 2000, instruction: 4000, output: 20000, diff: 20000, steps: 5 };
const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function now() { return new Date().toISOString(); }
function trunc(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n) + `\n…[truncated ${s.length - n} chars]` : s;
}

function validCheck(c) {
  if (typeof c !== 'string' || c.length === 0 || c.length > 500 || c.includes('..')) return false;
  return c === 'npm test'
    || /^node --check [\w\-./\\ ]+$/.test(c)
    || /^node --test [\w\-./\\ ]+$/.test(c);
}

function createWorkflow(opts) {
  const projectRoot = opts.projectRoot;
  const tasksDir = opts.tasksDir || path.join(projectRoot, 'tasks');
  const workDir = opts.workDir || path.join(projectRoot, '.nova-work');
  const mock = !!opts.mock;
  const codexBin = opts.codexBin || 'codex';
  const geminiBin = opts.geminiBin || 'gemini';
  const defaultTimeoutMs = opts.defaultTimeoutMs || 10 * 60 * 1000;

  const AGENTS = {
    codex: { id: 'codex', label: 'Codex CLI (local workspace)', role: 'writer' },
    gemini: { id: 'gemini', label: 'Gemini CLI (local workspace)', role: 'reviewer' },
    muse: { id: 'muse', label: 'Muse Code (Chat-Session)', role: 'session' },
  };

  let runningTaskId = null;
  let currentChild = null;
  let agentsCache = null;

  // ---------- store ----------
  function ensureTasks() { fs.mkdirSync(tasksDir, { recursive: true }); }
  function taskFile(id) { return path.join(tasksDir, id + '.json'); }
  function saveTask(t) {
    ensureTasks();
    const tmp = taskFile(t.id) + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(t, null, 2));
    fs.renameSync(tmp, taskFile(t.id));
  }
  function loadTask(id) {
    if (!/^t[a-z0-9]+$/.test(String(id))) return null;
    try { return JSON.parse(fs.readFileSync(taskFile(id), 'utf8')); }
    catch { return null; }
  }
  function listTasks() {
    ensureTasks();
    return fs.readdirSync(tasksDir)
      .filter((f) => f.startsWith('t') && f.endsWith('.json'))
      .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(tasksDir, f), 'utf8')); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }
  function approvalsFile() { return path.join(tasksDir, 'approvals.json'); }
  function loadApprovals() {
    try { const a = JSON.parse(fs.readFileSync(approvalsFile(), 'utf8')); return Array.isArray(a) ? a : []; }
    catch { return []; }
  }
  function saveApprovals(a) { ensureTasks(); fs.writeFileSync(approvalsFile(), JSON.stringify(a, null, 2)); }

  // ---------- validation ----------
  function validateTaskInput(body) {
    if (!body || typeof body !== 'object') return 'body must be a JSON object';
    const { goal, steps, check } = body;
    if (typeof goal !== 'string' || !goal.trim() || goal.length > MAX.goal) return 'goal: 1..2000 chars';
    if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX.steps) return `steps: 1..${MAX.steps}`;
    for (const s of steps) {
      if (!s || !AGENTS[s.agent]) return `unknown agent: ${s && s.agent}`;
      if (typeof s.instruction !== 'string' || !s.instruction.trim() || s.instruction.length > MAX.instruction) {
        return 'instruction: 1..4000 chars';
      }
    }
    if (check !== undefined && check !== null && !validCheck(check)) return 'check: allowlisted node/npm command only';
    return null;
  }

  // ---------- process helpers ----------
  function git(args, cwd) {
    return new Promise((resolve) => {
      execFile('git', args, { cwd: cwd || projectRoot, timeout: 60000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
        (err, stdout, stderr) => resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || ''), error: err ? err.message : null }));
    });
  }

  // Spawn a CLI worker. Prompt ALWAYS via stdin (VERIFIED for codex + gemini).
  function spawnCli(agentId, prompt, cwd, timeoutMs) {
    return new Promise((resolve) => {
      const started = Date.now();
      const finish = (err, stdout, stderr) => {
        currentChild = null;
        const timedOut = !!err && (err.killed || /timed out/i.test(String(err.message || '')));
        resolve({
          exitCode: err ? (typeof err.code === 'number' ? err.code : null) : 0,
          timedOut, durationMs: Date.now() - started,
          stdout: trunc(stdout, MAX.output), stderr: trunc(stderr, MAX.output),
          error: err ? String(err.message || err).slice(0, 500) : null,
        });
      };
      if (mock) {
        currentChild = execFile(process.execPath, ['-e', `console.log("mock-ok:${agentId}");`],
          { cwd, timeout: Math.min(timeoutMs, 30000), maxBuffer: 1024 * 1024, windowsHide: true }, finish);
        return;
      }
      const bin = agentId === 'codex' ? codexBin : geminiBin;
      const args = agentId === 'codex' ? ['exec'] : [];
      if (process.platform === 'win32') {
        // .cmd shims need cmd.exe; prompt goes via stdin, never argv.
        currentChild = execFile('cmd.exe', ['/d', '/s', '/c', bin, ...args],
          { cwd, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, finish);
      } else {
        currentChild = execFile(bin, args,
          { cwd, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, finish);
      }
      try { currentChild.stdin.write(prompt); currentChild.stdin.end(); }
      catch (e) { finish(e, '', ''); }
    });
  }

  function runVersion(bin) {
    return new Promise((resolve) => {
      const file = process.platform === 'win32' ? 'cmd.exe' : bin;
      const args = process.platform === 'win32' ? ['/d', '/s', '/c', bin, '--version'] : ['--version'];
      execFile(file, args, { timeout: 20000, maxBuffer: 64 * 1024, windowsHide: true }, (err, stdout, stderr) => {
        if (err) return resolve({ ok: false, version: null, error: String(stderr || err.message || err).slice(0, 300) });
        const line = String(stdout || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] || 'ok';
        resolve({ ok: true, version: line.slice(0, 120), error: null });
      });
    });
  }

  async function runCheck(command, cwd) {
    const started = Date.now();
    const parts = command.split(' ').filter(Boolean);
    const useCmd = process.platform === 'win32' && parts[0] !== 'node';
    const file = useCmd ? 'cmd.exe' : parts[0];
    const args = useCmd ? ['/d', '/s', '/c', ...parts] : parts.slice(1);
    return new Promise((resolve) => {
      execFile(file, args, { cwd, timeout: 5 * 60 * 1000, maxBuffer: 2 * 1024 * 1024, windowsHide: true },
        (err, stdout, stderr) => resolve({
          command, exitCode: err ? (typeof err.code === 'number' ? err.code : null) : 0,
          output: trunc(String(stdout || '') + (stderr ? `\n--- stderr ---\n${stderr}` : ''), 6000),
          durationMs: Date.now() - started,
        }));
    });
  }

  // ---------- agents ----------
  async function getAgents() {
    if (agentsCache && Date.now() - agentsCache.at < 60000) return agentsCache.data;
    const out = [];
    for (const id of ['codex', 'gemini']) {
      const r = await runVersion(id === 'codex' ? codexBin : geminiBin);
      out.push({
        id, label: AGENTS[id].label, role: AGENTS[id].role,
        status: r.ok ? 'ready' : 'unavailable', version: r.version,
        detail: r.ok ? 'CLI startet (Auth zeigt erster Task)' : r.error,
        lastCheck: now(),
      });
    }
    out.push({
      id: 'muse', label: AGENTS.muse.label, role: 'session', status: 'session',
      version: 'chat', detail: 'Interactive Session – holt Tasks aus Queue ab', lastCheck: now(),
    });
    agentsCache = { at: Date.now(), data: out };
    return out;
  }

  // ---------- tasks ----------
  function createTask(body) {
    const err = validateTaskInput(body);
    if (err) return { error: err };
    const t = {
      id: uid('t'), goal: body.goal.trim(), check: body.check || null,
      steps: body.steps.map((s, i) => ({
        n: i + 1, id: 's' + (i + 1), agent: s.agent, instruction: s.instruction.trim(),
        status: 'pending', startedAt: null, endedAt: null, exitCode: null,
        timedOut: false, durationMs: null, output: null, error: null,
      })),
      status: 'received', outcome: null, branch: null, worktree: null, baseCommit: null,
      diffStat: null, diff: null, checkResult: null, approvalId: null,
      createdAt: now(), startedAt: null, endedAt: null, cancelRequested: false,
    };
    saveTask(t);
    return { task: t };
  }

  function buildPrompt(t, step) {
    const role = step.agent === 'codex'
      ? 'writer: implement the minimal change that fulfills YOUR STEP'
      : 'reviewer: READ-ONLY – inspect and report, do not modify any files';
    return [
      `NOVA-META-Edition task ${t.id}, step ${step.n}/${t.steps.length}. You are ${step.agent}, ${role}.`,
      `Worktree: ${t.worktree} (branch ${t.branch}, base ${t.baseCommit}). Stay inside it.`,
      `GOAL: ${t.goal}`,
      `YOUR STEP: ${step.instruction}`,
      'Rules: no commit/push/merge; do not read .env files or secrets; end with a short summary + files touched.',
    ].join('\n');
  }

  function failTask(id, outcome) {
    try {
      const x = loadTask(id);
      if (x && !TERMINAL.has(x.status)) {
        x.status = 'failed'; x.outcome = String(outcome).slice(0, 300); x.endedAt = now();
        saveTask(x);
      }
    } catch { /* store best-effort */ }
    finally { if (runningTaskId === id) runningTaskId = null; }
  }

  function startTask(id) {
    const t = loadTask(id);
    if (!t) return { error: 'task not found', code: 404 };
    if (TERMINAL.has(t.status)) return { error: 'already terminal: ' + t.status, code: 409 };
    if (t.status === 'running' || runningTaskId === id) return { task: t };
    if (runningTaskId) return { error: 'another task running: ' + runningTaskId, code: 409 };
    t.status = 'running'; t.startedAt = t.startedAt || now(); t.cancelRequested = false;
    saveTask(t);
    runningTaskId = id;
    pump(id).catch((e) => failTask(id, 'pump error: ' + (e && e.message)));
    return { task: loadTask(id) };
  }

  async function pump(id) {
    const t = loadTask(id);
    if (!t) { runningTaskId = null; return; }
    try {
      if (!t.worktree) {
        if (mock) {
          t.worktree = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-mock-'));
          t.branch = 'mock'; t.baseCommit = 'mock';
        } else {
          const base = await git(['rev-parse', 'HEAD'], projectRoot);
          t.baseCommit = base.ok ? base.stdout.trim() : 'HEAD';
          t.branch = 'task/' + t.id;
          t.worktree = path.join(workDir, t.id);
          fs.mkdirSync(workDir, { recursive: true });
          const r = await git(['worktree', 'add', t.worktree, '-b', t.branch, t.baseCommit], projectRoot);
          if (!r.ok) throw new Error('worktree failed: ' + (r.stderr || r.error || '').slice(0, 300));
        }
        saveTask(t);
      }

      for (const step of t.steps) {
        const live = loadTask(id);
        if (live && live.cancelRequested) { t.cancelRequested = true; break; }
        if (step.status === 'completed' || step.status === 'skipped') continue;
        if (step.status === 'failed') break;
        if (step.agent === 'muse' && step.status === 'pending') {
          step.status = 'needs_input'; t.status = 'needs_input'; saveTask(t);
          runningTaskId = null;
          return;
        }
        step.status = 'running'; step.startedAt = now(); t.status = 'running'; saveTask(t);
        const r = await spawnCli(step.agent, buildPrompt(t, step), t.worktree, defaultTimeoutMs);
        step.endedAt = now(); step.exitCode = r.exitCode; step.timedOut = r.timedOut;
        step.durationMs = r.durationMs; step.error = r.error;
        step.output = trunc(`--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}`, MAX.output);
        step.status = (!r.timedOut && r.exitCode === 0) ? 'completed' : 'failed';
        saveTask(t);
        if (step.status === 'failed') break;
      }

      const live = loadTask(id);
      if (live && live.cancelRequested) {
        for (const s of t.steps) if (['pending', 'running', 'needs_input'].includes(s.status)) s.status = 'skipped';
        t.status = 'cancelled'; t.endedAt = now(); saveTask(t);
        return;
      }
      if (t.steps.some((s) => s.status === 'failed')) {
        t.status = 'failed'; t.outcome = 'step failed'; t.endedAt = now(); saveTask(t);
        return;
      }
      if (t.steps.some((s) => !['completed', 'skipped'].includes(s.status))) return; // waiting (muse)

      if (t.check) {
        t.checkResult = mock
          ? { command: t.check, exitCode: 0, output: 'mock check ok', durationMs: 1 }
          : await runCheck(t.check, t.worktree);
        saveTask(t);
      }
      if (mock) {
        t.diffStat = 'mock (no git ops in mock mode)'; t.diff = '';
      } else {
        const st = await git(['diff', '--stat'], t.worktree);
        const df = await git(['diff'], t.worktree);
        t.diffStat = trunc(st.stdout.trim() || '(no changes)', 2000);
        t.diff = trunc(df.stdout || '', MAX.diff);
      }
      saveTask(t);

      const approvals = loadApprovals();
      const a = {
        id: uid('a'), taskId: t.id, goal: t.goal, status: 'pending',
        summary: trunc(t.steps.map((s) => `Schritt ${s.n} [${s.agent}]: ${s.status}${s.exitCode !== null ? ` (exit ${s.exitCode})` : ''}${s.timedOut ? ' TIMEOUT' : ''}`).join('\n'), 2000),
        lastOutput: trunc(String(t.steps[t.steps.length - 1].output || '').slice(-1500), 1500),
        diffStat: t.diffStat, diff: trunc(t.diff, 6000),
        checkResult: t.checkResult, createdAt: now(), decidedAt: null, decidedBy: null, decision: null,
      };
      approvals.unshift(a); saveApprovals(approvals);
      t.approvalId = a.id; t.status = 'review_ready'; t.endedAt = now(); saveTask(t);
    } finally {
      if (runningTaskId === id) runningTaskId = null;
    }
  }

  function cancelTask(id) {
    const t = loadTask(id);
    if (!t) return { error: 'task not found', code: 404 };
    if (TERMINAL.has(t.status)) return { error: 'already terminal: ' + t.status, code: 409 };
    t.cancelRequested = true;
    if (currentChild && runningTaskId === id) { try { currentChild.kill(); } catch { /* already gone */ } }
    if (['received', 'needs_input', 'review_ready'].includes(t.status)) {
      for (const s of t.steps) if (['pending', 'running', 'needs_input'].includes(s.status)) s.status = 'skipped';
      t.status = 'cancelled'; t.endedAt = now();
    }
    saveTask(t);
    return { task: t };
  }

  function submitStepResult(body) {
    const { taskId, stepId, output, status } = body || {};
    const t = loadTask(taskId);
    if (!t) return { error: 'task not found', code: 404 };
    const s = t.steps.find((x) => x.id === stepId);
    if (!s || s.agent !== 'muse' || s.status !== 'needs_input') {
      return { error: 'step not awaiting muse result', code: 409 };
    }
    if (status !== 'completed' && status !== 'failed') return { error: 'status must be completed|failed', code: 400 };
    if (output !== undefined && (typeof output !== 'string' || output.length > 50000)) {
      return { error: 'output must be string <= 50000 chars', code: 400 };
    }
    s.status = status; s.output = trunc(output || '', MAX.output);
    s.endedAt = now(); s.exitCode = status === 'completed' ? 0 : 1;
    t.status = 'running'; t.cancelRequested = false;
    saveTask(t);
    if (runningTaskId && runningTaskId !== t.id) return { task: t, note: 'another task running; resume later' };
    runningTaskId = t.id;
    pump(t.id).catch((e) => failTask(t.id, 'pump error: ' + (e && e.message)));
    return { task: loadTask(t.id) };
  }

  // ---------- approvals ----------
  function decideApproval(body) {
    const { id, decision, by } = body || {};
    if (!['yes', 'no', 'info'].includes(decision)) return { error: 'decision must be yes|no|info', code: 400 };
    const approvals = loadApprovals();
    const a = approvals.find((x) => x.id === id);
    if (!a) return { error: 'approval not found', code: 404 };
    if (a.status !== 'pending') return { error: 'already decided', code: 409 };
    a.status = 'decided'; a.decision = decision;
    a.decidedBy = String(by || 'human').slice(0, 80); a.decidedAt = now();
    saveApprovals(approvals);
    const t = loadTask(a.taskId);
    if (t && !TERMINAL.has(t.status)) {
      if (decision === 'info') { t.status = 'needs_input'; t.outcome = 'info-requested'; }
      else { t.status = 'completed'; t.outcome = decision === 'yes' ? 'approved' : 'rejected'; t.endedAt = now(); }
      saveTask(t);
    }
    return { approval: a };
  }

  async function cleanupTask(id) {
    const t = loadTask(id);
    if (!t) return { error: 'task not found', code: 404 };
    if (!TERMINAL.has(t.status)) return { error: 'task not terminal', code: 409 };
    if (t.worktree && !mock) {
      await git(['worktree', 'remove', '--force', t.worktree], projectRoot);
      if (t.branch) await git(['branch', '-D', t.branch], projectRoot);
    }
    return { ok: true };
  }

  return {
    AGENTS, getAgents, createTask, loadTask, listTasks, startTask, cancelTask,
    submitStepResult, loadApprovals, decideApproval, cleanupTask, validateTaskInput,
  };
}

module.exports = { createWorkflow, validCheck, TERMINAL: [...TERMINAL] };
