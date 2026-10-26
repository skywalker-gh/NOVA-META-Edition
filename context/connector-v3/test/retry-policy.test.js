import test from 'node:test';
import assert from 'node:assert/strict';
import { computeReconnectDelay, parseRetryAfter, shouldStopRetry, sleepWithSignal } from '../src/retry-policy.js';

test('exponential reconnect backoff is jittered and capped at 30 seconds', () => {
  assert.equal(computeReconnectDelay({ attempt: 1, random: () => 0.5 }), 250);
  assert.equal(computeReconnectDelay({ attempt: 9, random: () => 1 }), 30_000);
});

test('429 Retry-After is honored with positive jitter and capped', () => {
  assert.equal(parseRetryAfter('4'), 4000);
  assert.equal(computeReconnectDelay({ attempt: 8, retryAfterMs: 4000, random: () => 0.5 }), 4500);
  assert.equal(computeReconnectDelay({ attempt: 8, retryAfterMs: 999_999, random: () => 1 }), 300_000);
});

test('401 and 404 stop reconnects; temporary server errors remain retryable', () => {
  assert.equal(shouldStopRetry(401), true);
  assert.equal(shouldStopRetry(404), true);
  assert.equal(shouldStopRetry(429), false);
  assert.equal(shouldStopRetry(503), false);
});

test('retry wait can be cancelled immediately on worker shutdown', async () => {
  const controller = new AbortController();
  const wait = sleepWithSignal(60_000, controller.signal);
  controller.abort();
  assert.equal(await wait, false);
});
