import type { BuildOptions } from 'esbuild';
import { UnsupportedFormatError } from '../errors/UnsupportedFormatError';
import { UnsupportedPlatformError } from '../errors/UnsupportedPlatformError';

export type SupportedFormat = 'cjs' | 'esm';

/**
 * Resolves the output format from esbuild options.
 *
 * Checks in order:
 * 1. TSUP_FORMAT define (for tsup compatibility - value is JSON like "\"cjs\"")
 * 2. esbuild format option
 * 3. Platform-based defaults (node → cjs, neutral → esm)
 *
 * @see https://esbuild.github.io/api/#format
 * @see https://github.com/egoist/tsup/blob/b906f86102c02f1ef66ebd4a3f7ff50bdc07af65/src/esbuild/index.ts#L204
 * @throws {UnsupportedFormatError} If format is set to something other than cjs or esm
 * @throws {UnsupportedPlatformError} If format is not set and platform is not node or neutral
 */
export const resolveFormat = (initialOptions: BuildOptions): SupportedFormat => {
  // Get format from TSUP_FORMAT (JSON string) or esbuild format option
  const tsupFormat = initialOptions.define?.TSUP_FORMAT;
  const format = tsupFormat ? JSON.parse(tsupFormat) : initialOptions.format;

  if (format) {
    if (format === 'cjs' || format === 'esm') {
      return format;
    }
    throw new UnsupportedFormatError(format);
  }

  // Format not set - use platform defaults
  if (initialOptions.platform === 'node') {
    return 'cjs';
  }
  if (initialOptions.platform === 'neutral') {
    return 'esm';
  }

  throw new UnsupportedPlatformError(initialOptions.platform);
};
