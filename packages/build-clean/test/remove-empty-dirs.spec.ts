import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { removeEmptyDirs } from '../src/core/removeEmptyDirs';
import { resolveOptions } from '../src/core/resolveOptions';
import { createCapturingLogger, createWorkspace } from './support/workspace';

describe('removing empty directories', () => {
  it('removes a directory left with nothing in it', async () => {
    const workspace = await createWorkspace('remove-empty-nested');
    await mkdir(join(workspace.outDir, 'empty'), { recursive: true });
    await writeFile(join(workspace.outDir, 'kept.js'), '// keeps the parent alive\n');
    const options = resolveOptions({ destructive: true, logger: createCapturingLogger() });

    await removeEmptyDirs(workspace.outDir, options);

    const expected = false;
    const actual = await mkdir(join(workspace.outDir, 'empty'), { recursive: false }).then(
      () => false,
      () => true,
    );

    expect(actual).toBe(expected);
  });

  // destructive is off by default, so this is what most consumers get.
  it('leaves the directory in place when not destructive', async () => {
    const workspace = await createWorkspace('remove-empty-dry-run');
    const emptyDir = join(workspace.outDir, 'empty');
    await mkdir(emptyDir, { recursive: true });
    const options = resolveOptions({ destructive: false, logger: createCapturingLogger() });

    await removeEmptyDirs(emptyDir, options);

    const expected = true;
    const actual = await readdir(emptyDir).then(
      () => true,
      () => false,
    );

    expect(actual).toBe(expected);
  });

  // Reading the directory is guarded and reports the failure, but the check for
  // what is left in it is not, so the failure surfaces as a throw regardless.
  // Pinned as it stands; the guard does not do what its shape suggests.
  it('reports a directory it cannot read', async () => {
    const workspace = await createWorkspace('remove-empty-unreadable');
    const notADirectory = join(workspace.root, 'notadirectory');
    await writeFile(notADirectory, 'this is a file\n');
    const logger = createCapturingLogger();

    await removeEmptyDirs(notADirectory, resolveOptions({ destructive: true, logger })).catch(() => {});

    const expected = true;
    const actual = logger.lines.some((line) => line.includes('Error reading directory'));

    expect(actual).toBe(expected);
  });

  it('throws when given something that is not a directory', async () => {
    const workspace = await createWorkspace('remove-empty-throws');
    const notADirectory = join(workspace.root, 'notadirectory');
    await writeFile(notADirectory, 'this is a file\n');
    const options = resolveOptions({ destructive: true, logger: createCapturingLogger() });

    await expect(removeEmptyDirs(notADirectory, options)).rejects.toThrow();
  });
});
