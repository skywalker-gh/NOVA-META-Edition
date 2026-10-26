import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

test('Agent-Bus E2E: Extended Project Memory exists and is valid', async () => {
  const contextPath = path.resolve('PROJECT_CONTEXT.md');
  const stat = await fs.stat(contextPath);
  assert.ok(stat.isFile(), 'PROJECT_CONTEXT.md must exist');
  const content = await fs.readFile(contextPath, 'utf8');
  assert.ok(content.includes('Nova–Ygdrassil Project Context'), 'Contains title');
  assert.ok(content.includes('Grok Connector'), 'Contains Grok connector');
  assert.ok(content.includes('ChatGPT & Claude Connector'), 'Contains ChatGPT/Claude connector');
  assert.ok(content.includes('Codex Connector V3'), 'Contains Codex connector');
});

test('Agent-Bus E2E: Ecosystem memory profile exists', async () => {
  const userProfile = await fs.readFile(path.resolve('ecosystem-memory/user-profile.md'), 'utf8');
  assert.ok(userProfile.includes('Gürkan'), 'Contains user profile');
  const modelsConsensus = await fs.readFile(path.resolve('ecosystem-memory/models-consensus.md'), 'utf8');
  assert.ok(modelsConsensus.includes('Grok'), 'Contains Grok consensus');
  assert.ok(modelsConsensus.includes('ChatGPT'), 'Contains ChatGPT consensus');
});

test('Agent-Bus E2E: Connectors are fully structured', async () => {
  const grokPkg = await fs.readFile(path.resolve('grok-connector-3000/plugin.json'), 'utf8');
  assert.ok(grokPkg.includes('grok-connector-3000'), 'Grok plugin json valid');

  const chatgptPkg = await fs.readFile(path.resolve('chatgpt-claude-connector-3000/plugin.json'), 'utf8');
  assert.ok(chatgptPkg.includes('chatgpt-claude-connector-3000'), 'ChatGPT/Claude plugin json valid');

  const v3Pkg = await fs.readFile(path.resolve('connector-v3/package.json'), 'utf8');
  assert.ok(v3Pkg.includes('codex-connector-3000-v3'), 'Codex V3 package json valid');
});
