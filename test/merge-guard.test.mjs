// Merge dirty-tree guard: merging into a dirty checkout must fail friendly,
// before git eats local changes. Direct unit test on a temp git repo (no bridge).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createWorkflow } from '../nova-workflow.js';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function seedTask(tasksDir, branch) {
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.writeFileSync(path.join(tasksDir, 'tmg1.json'), JSON.stringify({
    id: 'tmg1', goal: 'guard test', status: 'completed', outcome: 'approved', branch,
  }));
}

test('WF-merge: dirty checkout blocks with friendly error, clean tree merges', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-merge-guard-'));
  try {
    git(['init'], root);
    git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-m', 'init'], root);
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
    const tasksDir = path.join(root, 'tasks');
    seedTask(tasksDir, branch);
    const wf = createWorkflow({ projectRoot: root, tasksDir, mock: false });
    // tasks/ itself is untracked -> dirty. Must block, not merge.
    const blocked = await wf.mergeTask('tmg1');
    assert.equal(blocked.code, 409);
    assert.match(blocked.error, /commit or stash local changes first/);
    assert.match(blocked.error, /open file/);
    // clean the tree -> merge of current branch into itself succeeds
    git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'], root);
    git(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-m', 'clean'], root);
    const ok = await wf.mergeTask('tmg1');
    assert.equal(ok.ok, true);
    assert.ok(ok.task.mergedAt);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
