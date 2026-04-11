import { createUnplugin } from 'unplugin';
import type { Options } from '../../src';
import { graphqlPluginFactory } from '../../src/core/graphqlPluginFactory';
import { makeBuild } from './makeBuild';

export const runEsbuildSetup = (options: Options) => {
  const plugin = createUnplugin(graphqlPluginFactory);
  const esbuildPlugin = plugin.esbuild(options);
  const build = makeBuild();
  esbuildPlugin.setup(build);
  return build;
};
