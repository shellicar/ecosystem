import type { GlobOptionsWithFileTypesUnset } from 'glob';

export const resolveGlobOptions = (options: { globOptions?: GlobOptionsWithFileTypesUnset }): GlobOptionsWithFileTypesUnset => {
  return {
    ...options.globOptions,
  } satisfies GlobOptionsWithFileTypesUnset;
};
