import type { UnpluginFactory, UnpluginOptions } from 'unplugin';
import type { Options } from '../types';
import { createLogger } from './createLogger';
import { createPlugin } from './createPlugin';
import { createEsbuild } from './esbuild/createEsbuild';
import { resolveOptions } from './resolveOptions';
import { createVite } from './vite/createVite';

export const graphqlPluginFactory: UnpluginFactory<Options> = (inputOptions): UnpluginOptions => {
  const options = resolveOptions(inputOptions);
  const logger = createLogger(options);

  logger.debug({ options });

  const esbuild = createEsbuild(options, logger);
  const vite = createVite(options, logger);
  return createPlugin({ esbuild, vite }, options, logger);
};
