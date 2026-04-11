import type { Plugin } from 'esbuild';
import type { Options } from '../types';
import { createPlugin } from './createPlugin';
import { resolveOptions } from './resolveOptions';

export const plugin = (inputOptions: Options): Plugin => {
  if (!inputOptions?.mainModule) {
    throw new Error('build-azure-local-settings: mainModule option is required');
  }

  const options = resolveOptions(inputOptions);
  return createPlugin(options);
};
