import type { Options } from '../types';
import { createLogger } from './createLogger';
import { defaultOptions } from './defaultOptions';
import type { ResolvedOptions } from './types';

export const resolveOptions = (inputOptions: Options): ResolvedOptions => {
  const base = {
    ...defaultOptions,
    ...inputOptions,
    features: {
      ...defaultOptions.features,
      ...inputOptions.features,
    },
  };

  const options = {
    ...base,
    logger: inputOptions.logger ?? createLogger({ prefix: 'build-cleaner', debug: base.debug, verbose: base.verbose }),
  } satisfies ResolvedOptions;

  return options;
};
