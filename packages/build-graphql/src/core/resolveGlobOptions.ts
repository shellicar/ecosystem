import type { GlobOptionsWithFileTypesUnset } from 'glob';
import { defaultOptions } from './defaultOptions';

/**
 * Applies the consumer's `globOptions` over the defaults, key by key.
 * A consumer's `ignore` replaces the default `ignore`; it is not merged with it.
 */
export const resolveGlobOptions = (options: { globOptions?: GlobOptionsWithFileTypesUnset }): GlobOptionsWithFileTypesUnset => {
  // TODO(claude): undecided: whether `globOptions: { ignore: undefined }` keeps the default ignore or removes it. Removes it for now, as a spread does.
  return {
    ...defaultOptions.globOptions,
    ...options.globOptions,
  } satisfies GlobOptionsWithFileTypesUnset;
};
