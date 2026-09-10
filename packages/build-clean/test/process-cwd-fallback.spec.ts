import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginBuild } from 'esbuild';
import { describe, expect, it } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { createCapturingLogger, createWorkspace, listOutput } from './support/workspace';

// esbuild leaves initialOptions.absWorkingDir undefined when a build does not
// set it, which is the common case, and keys its metafile relative to the
// process working directory instead. Every other test sets absWorkingDir, so
// nothing else reaches the fallback.
//
// Driving the hook directly rather than through a real build: esbuild's service
// keeps its own working directory, so moving the process one moves what the
// plugin sees without moving what esbuild resolves against, and the build would
// fail for an unrelated reason.
describe('a build that does not set absWorkingDir', () => {
  it('cleans relative to the process working directory', async () => {
    const workspace = await createWorkspace('process-cwd-fallback');
    const logger = createCapturingLogger();
    await writeFile(join(workspace.outDir, 'main.js'), 'console.log(1);\n');
    await writeFile(join(workspace.outDir, 'stale.js'), '// left over from an earlier build\n');

    let onEnd: ((result: unknown) => Promise<void>) | undefined;
    const fakeBuild = {
      initialOptions: { outdir: 'dist' },
      onEnd: (callback: (result: unknown) => Promise<void>) => {
        onEnd = callback;
      },
    } as unknown as PluginBuild;

    cleanPlugin({ destructive: true, logger }).setup(fakeBuild);

    const originalCwd = process.cwd();
    try {
      process.chdir(workspace.root);
      await onEnd?.({ errors: [], warnings: [], metafile: { outputs: { 'dist/main.js': {} } } });
    } finally {
      process.chdir(originalCwd);
    }

    const expected = ['main.js'];
    const actual = await listOutput(workspace.outDir);

    expect(actual).toEqual(expected);
  });
});
