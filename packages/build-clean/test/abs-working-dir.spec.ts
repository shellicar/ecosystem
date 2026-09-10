import { build } from 'esbuild';
import { describe, expect, it, onTestFailed } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace, listOutput } from './support/workspace';

// esbuild keys the metafile relative to absWorkingDir; the plugin used to
// compute its side relative to process.cwd(). Every workspace here is rooted
// outside the repository, so the two are never the same and this path is
// exercised by every test in the suite.
describe('absWorkingDir', () => {
  it('is not the process working directory, or the rest of this proves nothing', async () => {
    const workspace = await createWorkspace('abs-working-dir-differs');

    const expected = false;
    const actual = workspace.root === process.cwd();

    expect(actual).toBe(expected);
  });

  it('keeps the files esbuild just built', async () => {
    const workspace = await createWorkspace('abs-working-dir');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));

    await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] });

    const expected = ['main.js', 'nested/helper.js'];
    const actual = await listOutput(workspace.outDir);

    expect(actual).toEqual(expected);
  });
});
