import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanUnusedFiles } from '../src/core/cleanUnusedFiles';
import { resolveOptions } from '../src/core/resolveOptions';
import { createCapturingLogger, createWorkspace, listOutput } from './support/workspace';

// When the plugin cannot trust what it is looking at, it deletes nothing. This
// is the difference between the Windows incident being a loud error and being a
// silently deleted build.
describe('refusing to clean', () => {
  it('deletes nothing when no built file is found in the output directory', async () => {
    const workspace = await createWorkspace('refuse-nothing-resolved');
    await writeFile(join(workspace.outDir, 'stale.js'), '// not a build output\n');
    const options = resolveOptions({ destructive: true, logger: createCapturingLogger() });

    await cleanUnusedFiles('dist', new Set(['dist/never-built.js']), workspace.root, options);

    const expected = ['stale.js'];
    const actual = await listOutput(workspace.outDir);

    expect(actual).toEqual(expected);
  });

  it('fails the build when no built file is found and strict is on', async () => {
    const workspace = await createWorkspace('refuse-nothing-resolved-strict');
    await writeFile(join(workspace.outDir, 'stale.js'), '// not a build output\n');
    const options = resolveOptions({ destructive: true, strict: true, logger: createCapturingLogger() });

    await expect(cleanUnusedFiles('dist', new Set(['dist/never-built.js']), workspace.root, options)).rejects.toThrow('Refusing to clean');
  });

  // A directory that is not there yet is the ordinary first build. A directory
  // that cannot be read is not the same thing, and must not be mistaken for an
  // empty one. A plain file standing where a directory should be produces that
  // second case on every platform.
  it('refuses without failing the build when the output directory cannot be read', async () => {
    const workspace = await createWorkspace('refuse-unreadable');
    await writeFile(join(workspace.root, 'notadirectory'), 'this is a file\n');
    const logger = createCapturingLogger();

    await cleanUnusedFiles('notadirectory', new Set(['dist/main.js']), workspace.root, resolveOptions({ destructive: true, logger }));

    const expected = true;
    const actual = logger.lines.some((line) => line.includes('Refusing to clean. Could not read the output directory'));

    expect(actual).toBe(expected);
  });

  it('fails the build when the output directory cannot be read and strict is on', async () => {
    const workspace = await createWorkspace('refuse-unreadable-strict');
    await writeFile(join(workspace.root, 'notadirectory'), 'this is a file\n');
    const options = resolveOptions({ destructive: true, strict: true, logger: createCapturingLogger() });

    await expect(cleanUnusedFiles('notadirectory', new Set(['dist/main.js']), workspace.root, options)).rejects.toThrow('Refusing to clean');
  });
});
