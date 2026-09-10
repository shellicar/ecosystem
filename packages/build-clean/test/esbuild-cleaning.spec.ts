import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it, onTestFailed } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace, listOutput } from './support/workspace';

describe('esbuild output cleaning', () => {
  it('keeps the files esbuild just built', async () => {
    const workspace = await createWorkspace('keeps-built-files');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));

    await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] });

    const expected = ['main.js', 'nested/helper.js'];
    const actual = await listOutput(workspace.outDir);

    expect(actual).toEqual(expected);
  });

  it('removes a file esbuild did not build', async () => {
    const workspace = await createWorkspace('removes-unused-files');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));
    await writeFile(join(workspace.outDir, 'stale.js'), '// left over from an earlier build\n');

    await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] });

    const expected = false;
    const actual = (await listOutput(workspace.outDir)).includes('stale.js');

    expect(actual).toBe(expected);
  });
});
