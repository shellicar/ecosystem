import type { GlobOptionsWithFileTypesUnset } from 'glob';
import { defaultOptions } from './defaultOptions';

/**
 * Passes the consumer's `globOptions` through, with the default `ignore` when theirs is undefined.
 * A consumer's `ignore` replaces the default `ignore`; it is not merged with it.
 */
export const resolveGlobOptions = (options: { globOptions?: GlobOptionsWithFileTypesUnset }): GlobOptionsWithFileTypesUnset => {
  return {
    ...options.globOptions,
    ignore: options.globOptions?.ignore ?? defaultOptions.globOptions.ignore,
  } satisfies GlobOptionsWithFileTypesUnset;
};
