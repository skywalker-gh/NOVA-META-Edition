// P0 security regression tests: S1 (dashboard) + S2 (bridge) containment & auth.
// Run: npm test (cwd = repo root). Uses only node built-ins (node:test, node:assert).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  resolveStaticPath,
  isAuthorized as dashAuthorized,
  HOST,
} from '../context/dashboard/server.mjs';

const require = createRequire(import.meta.url);
const bridge = require('../muse-spark-bridge.js');

const ROOT = path.resolve('.');
const CTX = path.join(ROOT, 'context');

// Guard: tests must run from repo root.
assert.ok(
  fs.existsSync(path.join(CTX, 'dashboard', 'index.html')),
  `run from repo root (missing ${path.join(CTX, 'dashboard', 'index.html')})`
);

// ---------- S2: bridge local reader ----------

test('S2: legit file inside root resolves and reads', () => {
  const full = bridge.resolveLocalPath('package.json');
  assert.ok(full.endsWith('package.json'));
  const content = bridge.readLocalFile('package.json');
  assert.ok(content.includes('nova-meta-edition'));
});

test('S2: path traversal outside root is forbidden', () => {
  for (const p of [
    '../outside.txt',
    '../../etc/hosts',
    '..\\..\\Windows\\win.ini',
    'context/../../outside.txt',
    path.join(os.tmpdir(), 'p0-probe.txt'), // absolute, outside root
    'C:\\Windows\\System32\\drivers\\etc\\hosts',
  ]) {
    assert.throws(() => bridge.resolveLocalPath(p), /Forbidden/, p);
  }
});

test('S2: sensitive files are forbidden even when they exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT, '.env')), 'precondition: root .env exists');
  for (const p of ['.env', 'context/grok-connector-3000/.env', 'Token.json', 'x/sub/.env.local', 'key.pem', 'k.key']) {
    assert.throws(() => bridge.resolveLocalPath(p), /Forbidden/, p);
  }
});

test('S2: missing and empty paths keep distinct errors', () => {
  assert.throws(() => bridge.resolveLocalPath('does-not-exist-p0.txt'), /File not found/);
  assert.throws(() => bridge.resolveLocalPath(''), /Missing/);
  assert.throws(() => bridge.resolveLocalPath(null), /Missing/);
});

test('S2: bearer auth is open only without configured token', () => {
  assert.equal(bridge.isAuthorized({ headers: {} }, ''), true);
  assert.equal(bridge.isAuthorized({ headers: { authorization: 'Bearer s3cret' } }, 's3cret'), true);
  assert.equal(bridge.isAuthorized({ headers: { authorization: 'bearer s3cret' } }, 's3cret'), true);
  assert.equal(bridge.isAuthorized({ headers: {} }, 's3cret'), false);
  assert.equal(bridge.isAuthorized({ headers: { authorization: 'Bearer wrong' } }, 's3cret'), false);
  assert.equal(bridge.isAuthorized({ headers: { authorization: 'Basic czNjcmV0' } }, 's3cret'), false);
});

// ---------- S1: dashboard server ----------

test('S1: server binds loopback only', () => {
  assert.equal(HOST, '127.0.0.1');
});

test('S1: legit static paths resolve inside context/', () => {
  assert.equal(resolveStaticPath('/', CTX), path.join(CTX, 'dashboard', 'index.html'));
  assert.equal(
    resolveStaticPath('/nova-sounds/sounds-map.json', CTX),
    path.join(CTX, 'nova-sounds', 'sounds-map.json')
  );
  assert.equal(resolveStaticPath('/logo.ico', CTX), path.join(CTX, 'logo.ico'));
});

test('S1: traversal, encoded traversal and dotfiles are blocked', () => {
  for (const p of [
    '/../.env',
    '/..%2f..%2f.env',
    '/%2e%2e/%2e%2e/.env',
    '/nova-sounds/../../.env',
    '/dashboard/../../muse-spark-bridge.js',
    '/.env',
    '/.gitignore',
    '/dashboard/.env',
    '/nova-sounds/',
    'no-leading-slash',
    '/%E0%A4%A', // invalid encoding
  ]) {
    assert.equal(resolveStaticPath(p, CTX), null, p);
  }
});

test('S1: bearer auth is open only without configured token', () => {
  assert.equal(dashAuthorized({ headers: {} }, ''), true);
  assert.equal(dashAuthorized({ headers: { authorization: 'Bearer t0k' } }, 't0k'), true);
  assert.equal(dashAuthorized({ headers: {} }, 't0k'), false);
  assert.equal(dashAuthorized({ headers: { authorization: 'Bearer wrong' } }, 't0k'), false);
});
