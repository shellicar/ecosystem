import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import graphqlPlugin from '../../src/esbuild';
import type { Options } from '../../src/types';

const nodeModulesFile = 'node_modules/fixture-dependency/dependency.graphql';

describe('default node_modules ignore', () => {
  const buildWithOptions = async (options: Options) => {
    const result = await build({
      entryPoints: ['test/typedefs-entry.ts'],
      bundle: true,
      platform: 'node',
      plugins: [graphqlPlugin(options)],
      write: false,
    });
    return result.outputFiles[0].text;
  };

  it('does not match files under node_modules by default', async () => {
    const output = await buildWithOptions({ globPattern: 'test/**/*.graphql' });

    expect(output).not.toContain(nodeModulesFile);
  });

  it('does not match files under node_modules when globOptions has no ignore', async () => {
    const output = await buildWithOptions({ globPattern: 'test/**/*.graphql', globOptions: { dot: false } });

    expect(output).not.toContain(nodeModulesFile);
  });

  it('matches files under node_modules when globOptions.ignore does not cover them', async () => {
    const output = await buildWithOptions({
      globPattern: 'test/**/*.graphql',
      globOptions: {
        ignore: '**/mutation.graphql',
      },
    });

    expect(output).toContain(nodeModulesFile);
  });
});
