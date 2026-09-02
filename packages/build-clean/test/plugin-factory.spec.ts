import type { Plugin } from 'esbuild';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import cleanPlugin from '../src/esbuild';
import { buildOptions, createCapturingLogger, createWorkspace } from './support/workspace';

const errorTexts = (failure: unknown): string[] => (failure as { errors?: { text: string }[] }).errors?.map((error) => error.text) ?? [];

// The two things the plugin refuses to proceed without. Both are configuration
// faults rather than anything about the output directory's contents, so they
// throw rather than going through the refusal path.
describe('what the esbuild hook requires', () => {
  it('reports a build that has no output directory', async () => {
    const workspace = await createWorkspace('no-outdir');
    const logger = createCapturingLogger();

    const failure = await build({
      absWorkingDir: workspace.root,
      entryPoints: ['src/main.ts'],
      outfile: 'out.js',
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node22',
      plugins: [cleanPlugin({ logger })],
    }).catch((error: unknown) => error);

    const expected = true;
    const actual = errorTexts(failure).some((text) => text.includes('No output directory specified'));

    expect(actual).toBe(expected);
  });

  // setup turns the metafile on, so its absence after a successful build means
  // something else turned it back off.
  it('reports a metafile switched off after the plugin enabled it', async () => {
    const workspace = await createWorkspace('metafile-removed');
    const logger = createCapturingLogger();
    const disableMetafile: Plugin = {
      name: 'disable-metafile',
      setup(build) {
        build.initialOptions.metafile = false;
      },
    };

    const failure = await build({ ...buildOptions(workspace), plugins: [cleanPlugin({ logger }), disableMetafile] }).catch((error: unknown) => error);

    const expected = true;
    const actual = errorTexts(failure).some((text) => text.includes('No metafile available'));

    expect(actual).toBe(expected);
  });
});
