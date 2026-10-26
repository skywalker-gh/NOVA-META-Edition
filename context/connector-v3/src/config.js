import path from 'node:path';
import { realpathSync, statSync } from 'node:fs';

export class ConfigError extends Error {
  constructor(names) {
    const list = [...new Set(names)].join(', ');
    super(`Invalid or missing configuration: ${list}`);
    this.name = 'ConfigError';
  }
}

function required(env, name, invalid = []) {
  const value = env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    invalid.push(name);
    return undefined;
  }
  return value.trim();
}

function validateHash(env, name, invalid) {
  const value = required(env, name, invalid);
  if (value !== undefined && !/^[a-f\d]{64}$/i.test(value)) invalid.push(name);
  return value;
}

export function loadGatewayConfig(env = process.env) {
  const invalid = [];
  const rawPort = required(env, 'PORT', invalid);
  const port = rawPort === undefined ? undefined : Number(rawPort);
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) invalid.push('PORT');

  const rawDatabaseUrl = required(env, 'DATABASE_URL', invalid);
  let databaseUrl;
  if (rawDatabaseUrl !== undefined) {
    try {
      const parsed = new URL(rawDatabaseUrl);
      if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) {
        invalid.push('DATABASE_URL');
      } else databaseUrl = rawDatabaseUrl;
    } catch {
      invalid.push('DATABASE_URL');
    }
  }
  const mcpTokenHash = validateHash(env, 'MCP_BEARER_TOKEN_HASH', invalid);
  const workerTokenHash = validateHash(env, 'WORKER_TOKEN_HASH', invalid);
  if (invalid.length) throw new ConfigError(invalid);
  return Object.freeze({ host: '0.0.0.0', port, databaseUrl, mcpTokenHash, workerTokenHash });
}

export function loadWorkerConfig(env = process.env) {
  const invalid = [];
  const rawGatewayUrl = required(env, 'GATEWAY_URL', invalid);
  let gatewayUrl;
  if (rawGatewayUrl !== undefined) {
    try {
      gatewayUrl = new URL(rawGatewayUrl);
      const secure = gatewayUrl.protocol === 'wss:';
      const localInsecure = gatewayUrl.protocol === 'ws:' && ['localhost', '127.0.0.1', '::1'].includes(gatewayUrl.hostname);
      if ((!secure && !localInsecure) || gatewayUrl.pathname !== '/worker' || gatewayUrl.username || gatewayUrl.password || gatewayUrl.search || gatewayUrl.hash) {
        invalid.push('GATEWAY_URL');
      }
    } catch {
      invalid.push('GATEWAY_URL');
    }
  }
  const workerToken = required(env, 'WORKER_TOKEN', invalid);
  const rawRoot = required(env, 'NOVA_PROJECT_ROOT', invalid);
  let projectRoot;
  if (rawRoot !== undefined) {
    projectRoot = path.resolve(rawRoot);
    try {
      if (!statSync(projectRoot).isDirectory()) invalid.push('NOVA_PROJECT_ROOT');
      else projectRoot = realpathSync(projectRoot);
    } catch { invalid.push('NOVA_PROJECT_ROOT'); }
  }
  const codexBin = env.CODEX_BIN?.trim() || 'codex';
  if (/\.(cmd|bat)$/i.test(codexBin)) invalid.push('CODEX_BIN');
  if (invalid.length) throw new ConfigError(invalid);
  return Object.freeze({ gatewayUrl: gatewayUrl.href, workerToken, projectRoot, codexBin });
}
