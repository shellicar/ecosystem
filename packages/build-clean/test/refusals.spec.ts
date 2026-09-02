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

  // The boundary of the refusal. Zero matches only means the wrong directory
  // when there was something to match: a build that produced nothing matches
  // nothing by definition, and everything present is from an earlier build.
  it('removes stale files when the build produced no outputs at all', async () => {
    const workspace = await createWorkspace('no-outputs');
    await writeFile(join(workspace.outDir, 'stale.js'), '// from an earlier build\n');
    const options = resolveOptions({ destructive: true, logger: createCapturingLogger() });

    await cleanUnusedFiles('dist', new Set<string>(), workspace.root, options);

    const expected: string[] = [];
    const actual = await listOutput(workspace.outDir);

    expect(actual).toEqual(expected);
  });

  it('fails the build when no built file is found and strict is on', async () => {
    const workspace = await createWorkspace('refuse-nothing-resolved-strict');
    await writeFile(join(workspace.outDir, 'stale.js'), '// not a build output\n');
    const options = resolveOptions({ destructive: true, strict: true, logger: createCapturingLogger() });

    await expect(cleanUnusedFiles('dist', new Set(['dist/never-built.js']), workspace.root, options)).rejects.toThrow('Refusing to clean');
  });

  it('does not print a trailing undefined when the refusal has no cause', async () => {
    const workspace = await createWorkspace('refuse-no-cause-message');
    await writeFile(join(workspace.outDir, 'stale.js'), '// not a build output\n');
    const logger = createCapturingLogger();

    await cleanUnusedFiles('dist', new Set(['dist/never-built.js']), workspace.root, resolveOptions({ destructive: true, logger }));

    const expected = false;
    const actual = logger.lines.some((line) => line.endsWith('undefined'));

    expect(actual).toBe(expected);
  });

  it('logs the refusal once when strict turns it into a failure', async () => {
    const workspace = await createWorkspace('refuse-strict-single-log');
    await writeFile(join(workspace.outDir, 'stale.js'), '// not a build output\n');
    const logger = createCapturingLogger();

    await cleanUnusedFiles('dist', new Set(['dist/never-built.js']), workspace.root, resolveOptions({ destructive: true, strict: true, logger })).catch(() => {});

    const expected = 1;
    const actual = logger.lines.filter((line) => line.startsWith('[error]')).length;

    expect(actual).toBe(expected);
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
