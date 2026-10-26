import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';

export class ProjectPathError extends Error {
  constructor() {
    super('Requested path is outside the configured project root or cannot be resolved safely.');
    this.name = 'ProjectPathError';
  }
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export async function resolveProjectPath(root, candidate) {
  try {
    const canonicalRoot = await realpath(root);
    if (!(await stat(canonicalRoot)).isDirectory()) throw new ProjectPathError();
    const target = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(canonicalRoot, candidate);
    if (!isWithin(canonicalRoot, target)) throw new ProjectPathError();

    // Existing paths are resolved through symlinks. For a not-yet-created leaf,
    // resolve its nearest existing parent and validate the full resulting path.
    let probe = target;
    const suffix = [];
    while (true) {
      try {
        const canonicalProbe = await realpath(probe);
        const canonicalTarget = path.join(canonicalProbe, ...suffix.reverse());
        if (!isWithin(canonicalRoot, canonicalTarget)) throw new ProjectPathError();
        return canonicalTarget;
      } catch (error) {
        if (error instanceof ProjectPathError) throw error;
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
        const parent = path.dirname(probe);
        if (parent === probe) throw new ProjectPathError();
        suffix.push(path.basename(probe));
        probe = parent;
      }
    }
  } catch (error) {
    if (error instanceof ProjectPathError) throw error;
    throw new ProjectPathError();
  }
}
