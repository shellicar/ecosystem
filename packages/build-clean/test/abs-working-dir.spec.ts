import { resolve } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it, onTestFailed } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace, listOutput } from './support/workspace';

// esbuild keys the metafile relative to absWorkingDir; the plugin computes its
// side relative to process.cwd(). Everything here is absolute and inside the
// temp workspace, so the deletion this provokes cannot reach a real directory.
describe('absWorkingDir', () => {
  it('keeps the files esbuild just built when absWorkingDir is not the process cwd', async () => {
    const workspace = await createWorkspace('abs-working-dir');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));

    await build({
      ...buildOptions(workspace),
      absWorkingDir: resolve(workspace.root),
      entryPoints: [resolve(workspace.srcDir, 'main.ts'), resolve(workspace.srcDir, 'nested', 'helper.ts')],
      outdir: resolve(workspace.outDir),
      plugins: [cleanPlugin({ destructive: true, logger })],
    });

    const expected = ['main.js', 'nested/helper.js'];
    const actual = await listOutput(workspace.outDir);

    expect(actual).toEqual(expected);
  });
});
