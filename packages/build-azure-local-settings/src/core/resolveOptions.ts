import type { Options } from '../types';
import { defaultOptions } from './defaultOptions';
import type { ResolvedOptions } from './types';

export const resolveOptions = (inputOptions: Options): ResolvedOptions => {
  const options = {
    ...defaultOptions,
    ...inputOptions,
    features: {
      ...defaultOptions.features,
      ...inputOptions.features,
    },
  } satisfies ResolvedOptions;

  return options;
};
