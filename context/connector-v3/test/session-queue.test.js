import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionQueue } from '../src/session-queue.js';

test('same-session tasks remain FIFO while independent tasks can overlap', async () => {
  const queue = new SessionQueue(2);
  const order = [];
  let active = 0;
  let maxActive = 0;
  const task = label => async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    order.push(`${label}:start`);
    await new Promise(resolve => setTimeout(resolve, 15));
    order.push(`${label}:end`);
    active--;
  };
  await Promise.all([
    queue.run('same', task('one')),
    queue.run('same', task('two')),
    queue.run('other', task('three'))
  ]);
  assert.equal(order.indexOf('one:end') < order.indexOf('two:start'), true);
  assert.equal(maxActive, 2);
});


test('an aborted queued task is removed and never runs', async () => {
  const queue = new SessionQueue(1);
  let release;
  const first = queue.run('first', () => new Promise(resolve => { release = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  const controller = new AbortController();
  let ran = false;
  const queued = queue.run('second', async () => { ran = true; }, { signal: controller.signal });
  controller.abort();
  await assert.rejects(queued, error => error.name === 'AbortError');
  release();
  await first;
  assert.equal(ran, false);
  assert.equal(queue.active, 0);
});
