import type { BuildOptions } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { UnsupportedFormatError } from '../errors/UnsupportedFormatError';
import { UnsupportedPlatformError } from '../errors/UnsupportedPlatformError';
import { resolveFormat } from './resolveFormat';

describe('resolveFormat', () => {
  describe('TSUP_FORMAT define', () => {
    it('returns cjs when TSUP_FORMAT is "cjs"', () => {
      const expected = 'cjs';
      const options = { define: { TSUP_FORMAT: '"cjs"' } } satisfies BuildOptions;

      const actual = resolveFormat(options);

      expect(actual).toBe(expected);
    });

    it('returns esm when TSUP_FORMAT is "esm"', () => {
      const expected = 'esm';
      const options = { define: { TSUP_FORMAT: '"esm"' } } satisfies BuildOptions;

      const actual = resolveFormat(options);

      expect(actual).toBe(expected);
    });

    it('takes precedence over esbuild format', () => {
      const expected = 'esm';
      const options = { define: { TSUP_FORMAT: '"esm"' }, format: 'cjs' } satisfies BuildOptions;

      const actual = resolveFormat(options);

      expect(actual).toBe(expected);
    });
  });

  describe('esbuild format option', () => {
    it('returns cjs when format is cjs', () => {
      const expected = 'cjs';
      const options = { format: 'cjs' } satisfies BuildOptions;

      const actual = resolveFormat(options);

      expect(actual).toBe(expected);
    });

    it('returns esm when format is esm', () => {
      const expected = 'esm';
      const options = { format: 'esm' } satisfies BuildOptions;

      const actual = resolveFormat(options);

      expect(actual).toBe(expected);
    });

    it('throws UnsupportedFormatError for iife', () => {
      const options = { format: 'iife' } satisfies BuildOptions;

      const actual = () => resolveFormat(options);

      expect(actual).toThrow(UnsupportedFormatError);
    });
  });

  describe('platform-based defaults', () => {
    it('returns cjs for node platform', () => {
      const expected = 'cjs';
      const options = { platform: 'node' } satisfies BuildOptions;

      const actual = resolveFormat(options);

      expect(actual).toBe(expected);
    });

    it('returns esm for neutral platform', () => {
      const expected = 'esm';
      const options = { platform: 'neutral' } satisfies BuildOptions;

      const actual = resolveFormat(options);

      expect(actual).toBe(expected);
    });

    it('throws UnsupportedPlatformError for browser platform', () => {
      const options = { platform: 'browser' } satisfies BuildOptions;

      const actual = () => resolveFormat(options);

      expect(actual).toThrow(UnsupportedPlatformError);
    });

    it('throws UnsupportedPlatformError when no format or platform set', () => {
      const options = {} satisfies BuildOptions;

      const actual = () => resolveFormat(options);

      expect(actual).toThrow(UnsupportedPlatformError);
    });
  });
});
