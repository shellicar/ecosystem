import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it, onTestFailed } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace, filesystemIsCaseInsensitive, listOutput } from './support/workspace';

// A stale output whose name differs from a built one only by case. The plugin
// matches names exactly, so what that means depends on the filesystem: on Linux
// the two are separate files and the stale one really is unused, while on macOS
// and Windows they are one file and removing it removes the build.
describe('output differing from a built file only by case', () => {
  it('keeps the file esbuild built', async () => {
    const workspace = await createWorkspace('case-mismatch-keeps-built');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));
    await writeFile(join(workspace.outDir, 'Main.js'), '// stale, differs from the built main.js only by case\n');

    await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] });

    const expected = true;
    const actual = (await listOutput(workspace.outDir)).some((file) => file.toLowerCase() === 'main.js');

    expect(actual).toBe(expected);
  });

  it.skipIf(filesystemIsCaseInsensitive())('removes the stale file where it is a separate file', async () => {
    const workspace = await createWorkspace('case-mismatch-removes-stale');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));
    await writeFile(join(workspace.outDir, 'Main.js'), '// stale, differs from the built main.js only by case\n');

    await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ destructive: true, logger })] });

    const expected = false;
    const actual = (await listOutput(workspace.outDir)).includes('Main.js');

    expect(actual).toBe(expected);
  });
});
