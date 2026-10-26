import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCodexArgs, parseCodexOutput, redactSecrets, spawnCodex } from '../src/codex-runner.js';
import { setTimeout as delay } from 'node:timers/promises';

test('new read-only calls use the fixed root and read-only sandbox', () => {
  const args = buildCodexArgs({ tool: 'codex_ask' }, 'C:\\Nova', 'inspect', true);
  assert.deepEqual(args.slice(0, 8), ['exec', '--sandbox', 'read-only', '--cd', 'C:\\Nova', '--json', '--skip-git-repo-check', 'inspect']);
});

test('implementation uses workspace-write and resumed sessions explicitly set sandbox policy', () => {
  const first = buildCodexArgs({ tool: 'codex_implement' }, 'C:\\Nova', 'change');
  assert.equal(first[2], 'workspace-write');
  const resumed = buildCodexArgs({ tool: 'codex_ask', session_id: '7dcf4acb-f140-4d8f-b877-916b26f051dc' }, 'C:\\Nova', 'ask', true);
  assert.ok(resumed.includes('7dcf4acb-f140-4d8f-b877-916b26f051dc'));
  assert.ok(resumed.includes('sandbox_mode="read-only"'));
});

test('JSONL output retains the thread ID and final agent message only', () => {
  const parsed = parseCodexOutput([
    JSON.stringify({ type: 'thread.started', thread_id: '7dcf4acb-f140-4d8f-b877-916b26f051dc' }),
    JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Status complete.' } }),
    'not json'
  ].join('\n'));
  assert.equal(parsed.sessionId, '7dcf4acb-f140-4d8f-b877-916b26f051dc');
  assert.equal(parsed.text, 'Status complete.');
});

test('common credential formats are redacted from returned output', () => {
  const safe = redactSecrets('api_key=private sk-1234567890abcdef ghp_1234567890abcdef');
  assert.doesNotMatch(safe, /private|sk-123|ghp_/);
  assert.match(safe, /REDACTED/);
});

test('aborting a Codex process waits until the child closes', async () => {
  const controller = new AbortController();
  const task = spawnCodex(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
    cwd: process.cwd(), timeoutMs: 60_000, signal: controller.signal
  });
  await delay(50);
  controller.abort();
  const result = await task;
  assert.equal(result.error, 'cancelled');
  assert.equal(result.code === null || result.code !== 0, true);
});
