import type { GlobOptionsWithFileTypesUnset } from 'glob';
import type { GlobIgnore } from '../types';

export const resolveGlobOptions = (options: { globOptions?: GlobOptionsWithFileTypesUnset; globIgnore?: GlobIgnore }): GlobOptionsWithFileTypesUnset => {
  return {
    ignore: options.globIgnore,
    ...options.globOptions,
  } satisfies GlobOptionsWithFileTypesUnset;
};
