import type { GlobOptionsWithFileTypesUnset } from 'glob';
import type { ErrorPolicy } from '../enums';
import type { Options } from '../types';
import { defaultOptions } from './defaultOptions';
import { resolveErrorPolicy } from './resolveErrorPolicy';
import { resolveGlobOptions } from './resolveGlobOptions';
import type { ResolvedOptions } from './types';

export const resolveOptions = (rawInputOptions: Options): ResolvedOptions => {
  const { errorPolicy, ignoreErrors, globOptions, globIgnore, ...inputOptions } = rawInputOptions;
  const resolvedErrorPolicy: ErrorPolicy = resolveErrorPolicy({ errorPolicy, ignoreErrors });
  const resolvedGlobOptions: GlobOptionsWithFileTypesUnset = resolveGlobOptions({ globOptions, globIgnore });
  const options = {
    ...defaultOptions,
    ...inputOptions,
    errorPolicy: resolvedErrorPolicy,
    globOptions: resolvedGlobOptions,
    features: {
      ...defaultOptions.features,
      ...inputOptions.features,
    },
  } satisfies ResolvedOptions;
  return options;
};
