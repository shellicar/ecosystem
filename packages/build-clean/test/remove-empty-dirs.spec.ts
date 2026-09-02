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
});
