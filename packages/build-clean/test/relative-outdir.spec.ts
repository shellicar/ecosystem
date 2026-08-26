import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it, onTestFailed } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace } from './support/workspace';

const wouldDelete = (lines: string[]): string[] =>
  lines
    .filter((line) => line.startsWith('[info] Deleting: "'))
    .map((line) => line.slice('[info] Deleting: "'.length, -1).split('\\').join('/'))
    .sort();

// A relative outdir with absWorkingDir set is the dangerous shape: the directory
// to walk sits under esbuild's working directory, so resolving it against the
// process one reaches an unrelated project's output. Deliberately not
// destructive, so a regression here reports the wrong target instead of
// emptying it.
describe('relative outdir under a different absWorkingDir', () => {
  it('considers only files under esbuild working directory for deletion', async () => {
    const workspace = await createWorkspace('relative-outdir');
    const logger = createCapturingLogger();
    onTestFailed(() => console.error(logger.lines.join('\n')));
    await writeFile(join(workspace.outDir, 'stale.js'), '// left over from an earlier build\n');

    await build({
      ...buildOptions(workspace),
      absWorkingDir: resolve(workspace.root),
      entryPoints: [resolve(workspace.srcDir, 'main.ts'), resolve(workspace.srcDir, 'nested', 'helper.ts')],
      outdir: 'dist',
      plugins: [cleanPlugin({ destructive: false, logger })],
    });

    const expected = ['dist/stale.js'];
    const actual = wouldDelete(logger.lines);

    expect(actual).toEqual(expected);
  });
});
