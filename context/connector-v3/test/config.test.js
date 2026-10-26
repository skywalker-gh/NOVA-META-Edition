import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const configApi = await import('../src/config.js').catch(importError => ({ importError }));
const loadGateway = () => {
  assert.equal(typeof configApi.loadGatewayConfig, 'function', `gateway config is not available: ${configApi.importError?.code || 'missing export'}`);
  return configApi.loadGatewayConfig;
};
const loadWorker = () => {
  assert.equal(typeof configApi.loadWorkerConfig, 'function', `worker config is not available: ${configApi.importError?.code || 'missing export'}`);
  return configApi.loadWorkerConfig;
};

test('gateway config rejects missing variables without exposing credential values', () => {
  assert.throws(() => loadGateway()({}), error => {
    assert.equal(error.name, 'ConfigError');
    assert.match(error.message, /DATABASE_URL/);
    return true;
  });
});

test('gateway config rejects malformed database URLs without echoing them', () => {
  const env = {
    PORT: '8080',
    DATABASE_URL: 'not-a-url-with-secret-token',
    MCP_BEARER_TOKEN_HASH: 'a'.repeat(64),
    WORKER_TOKEN_HASH: 'b'.repeat(64)
  };
  assert.throws(() => loadGateway()(env), error => {
    assert.equal(error.name, 'ConfigError');
    assert.match(error.message, /DATABASE_URL/);
    assert.doesNotMatch(error.message, /secret-token/);
    return true;
  });
});

test('gateway config rejects empty token verifiers', () => {
  const env = {
    PORT: '8080',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/connector',
    MCP_BEARER_TOKEN_HASH: '',
    WORKER_TOKEN_HASH: 'b'.repeat(64)
  };
  assert.throws(() => loadGateway()(env), error => {
    assert.equal(error.name, 'ConfigError');
    assert.match(error.message, /MCP_BEARER_TOKEN_HASH/);
    return true;
  });
});

test('worker config validates required values and accepts a local project root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'codex-worker-config-'));
  try {
    const config = loadWorker()({
      GATEWAY_URL: 'wss://connector.example/worker',
      WORKER_TOKEN: 'worker-secret',
      NOVA_PROJECT_ROOT: root,
      CODEX_BIN: 'codex.exe'
    });
    assert.equal(config.gatewayUrl, 'wss://connector.example/worker');
    assert.equal(config.projectRoot, root);
    assert.equal(config.codexBin, 'codex.exe');
    assert.equal(Object.isFrozen(config), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('worker config rejects shell script command shims', () => {
  assert.throws(() => loadWorker()({
    GATEWAY_URL: 'wss://connector.example/worker',
    WORKER_TOKEN: 'worker-secret',
    NOVA_PROJECT_ROOT: 'C:\\Nova',
    CODEX_BIN: 'codex.cmd'
  }), error => error.name === 'ConfigError' && /CODEX_BIN/.test(error.message));
});

test('worker config never includes a supplied token in configuration errors', () => {
  assert.throws(() => loadWorker()({
    GATEWAY_URL: 'not-a-url',
    WORKER_TOKEN: 'do-not-leak-this-token',
    NOVA_PROJECT_ROOT: 'C:\\Nova'
  }), error => {
    assert.equal(error.name, 'ConfigError');
    assert.match(error.message, /GATEWAY_URL/);
    assert.doesNotMatch(error.message, /do-not-leak-this-token/);
    return true;
  });
});
