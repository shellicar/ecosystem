import type { PluginBuild } from 'esbuild';
import type { UnpluginOptions } from 'unplugin';
import { Feature } from '../../enums';
import type { ILogger } from '../../types';
import type { ResolvedOptions } from '../types';
import { esbuildSetup } from './esbuildSetup';

export const createEsbuild = (options: ResolvedOptions, logger: ILogger): UnpluginOptions['esbuild'] => {
  if (options.features[Feature.EsbuildWatch]) {
    logger.debug('Creating ESBuild setup');
    return {
      setup: (build: PluginBuild) => esbuildSetup(build, options, logger),
    };
  }
  return undefined;
};
