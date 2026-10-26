import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const projectRootApi = await import('../src/project-root.js').catch(importError => ({ importError }));
const resolvePath = () => {
  assert.equal(typeof projectRootApi.resolveProjectPath, 'function', `project-root validator is not available: ${projectRootApi.importError?.code || 'missing export'}`);
  return projectRootApi.resolveProjectPath;
};

test('project-root resolution accepts a child path and returns its canonical path', async t => {
  const base = await mkdtemp(path.join(tmpdir(), 'codex-root-'));
  const root = path.join(base, 'project');
  await mkdir(path.join(root, 'src'), { recursive: true });
  t.after(() => rm(base, { recursive: true, force: true }));

  assert.equal(await resolvePath()(root, 'src'), await import('node:fs/promises').then(fs => fs.realpath(path.join(root, 'src'))));
});

test('project-root resolution rejects parent traversal', async t => {
  const base = await mkdtemp(path.join(tmpdir(), 'codex-root-'));
  const root = path.join(base, 'project');
  await mkdir(root);
  t.after(() => rm(base, { recursive: true, force: true }));

  await assert.rejects(resolvePath()(root, '../outside'), error => {
    assert.equal(error.name, 'ProjectPathError');
    return true;
  });
});

test('project-root resolution rejects an absolute path outside the root', async t => {
  const base = await mkdtemp(path.join(tmpdir(), 'codex-root-'));
  const root = path.join(base, 'project');
  const outside = path.join(base, 'outside');
  await Promise.all([mkdir(root), mkdir(outside)]);
  t.after(() => rm(base, { recursive: true, force: true }));

  await assert.rejects(resolvePath()(root, outside), error => {
    assert.equal(error.name, 'ProjectPathError');
    return true;
  });
});

test('project-root resolution rejects a symlink that escapes the root', async t => {
  const base = await mkdtemp(path.join(tmpdir(), 'codex-root-'));
  const root = path.join(base, 'project');
  const outside = path.join(base, 'outside');
  await Promise.all([mkdir(root), mkdir(outside)]);
  const link = path.join(root, 'external');
  try {
    await symlink(outside, link, 'junction');
  } catch (error) {
    await rm(base, { recursive: true, force: true });
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
      t.skip(`Windows did not allow creating a junction in this environment: ${error.code}`);
      return;
    }
    throw error;
  }
  t.after(() => rm(base, { recursive: true, force: true }));

  await assert.rejects(resolvePath()(root, 'external'), error => {
    assert.equal(error.name, 'ProjectPathError');
    return true;
  });
});
