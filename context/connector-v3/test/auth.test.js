import test from 'node:test';
import assert from 'node:assert/strict';
import { createTokenVerifier, hashToken, verifyMcpCaller } from '../src/auth.js';

test('bearer verifier authenticates in constant-time comparison and rejects wrong tokens', async () => {
  const verify = createTokenVerifier(hashToken('secret-value'), 'human');
  assert.deepEqual(await verify('secret-value'), { id: 'human' });
  assert.equal(await verify('wrong'), null);
  assert.equal(await verify(''), null);
});

test('MCP caller requires bearer auth and never echoes credentials', async () => {
  const verifier = createTokenVerifier(hashToken('right'));
  await assert.rejects(verifyMcpCaller(new Request('https://local/mcp'), verifier), error => error.status === 401);
  await assert.rejects(verifyMcpCaller(new Request('https://local/mcp', { headers: { authorization: 'Bearer wrong-token' } }), verifier), error => {
    assert.equal(error.status, 401);
    assert.doesNotMatch(error.message, /wrong-token/);
    return true;
  });
});
