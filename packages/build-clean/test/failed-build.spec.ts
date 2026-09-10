import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace } from './support/workspace';

// A build that fails produces no metafile, because there are no outputs to
// describe. That is the build's own failure and the plugin has nothing to say
// about it: adding an error of its own buries the one the user needs to read.
describe('a build that fails to compile', () => {
  it('reports only the errors the build itself produced', async () => {
    const workspace = await createWorkspace('failed-build');
    const logger = createCapturingLogger();
    await writeFile(join(workspace.srcDir, 'main.ts'), 'this is not valid typescript !!!\n');

    const failure = await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] }).catch((error: unknown) => error);

    const expected: string[] = [];
    const actual = (failure as { errors: { text: string }[] }).errors.map((error) => error.text).filter((text) => text.includes('build-cleaner'));

    expect(actual).toEqual(expected);
  });
});
