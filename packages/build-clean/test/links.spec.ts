import { link, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it, onTestFailed } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace, listOutput } from './support/workspace';

// Matching by filesystem identity has to answer for links, and the two kinds
// have different answers.
describe('links in the output directory', () => {
  it('removes a symlink pointing at a built file', async () => {
    const workspace = await createWorkspace('symlink');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));

    await build(buildOptions(workspace));
    await symlink('main.js', join(workspace.outDir, 'stale-link.js'));
    await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] });

    const expected = false;
    const actual = (await listOutput(workspace.outDir)).includes('stale-link.js');

    expect(actual).toBe(expected);
  });

  // A hard link is not a reference to a file, it is the file. Both names are
  // equally the thing esbuild wrote, and there is no fact about which one is
  // canonical, so identity matching keeps it. Decided behaviour, not an
  // oversight: the alternative is going back to comparing path strings, which is
  // what deleted people's builds on Windows.
  it('keeps a hard link to a built file', async () => {
    const workspace = await createWorkspace('hard-link');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));

    await build(buildOptions(workspace));
    await link(join(workspace.outDir, 'main.js'), join(workspace.outDir, 'stale-link.js'));
    await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] });

    const expected = true;
    const actual = (await listOutput(workspace.outDir)).includes('stale-link.js');

    expect(actual).toBe(expected);
  });
});
