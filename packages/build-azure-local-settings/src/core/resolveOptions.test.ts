import { describe, expect, it } from 'vitest';
import { Feature } from '../enums';
import type { Options } from '../types';
import { resolveOptions } from './resolveOptions';

describe('resolveOptions', () => {
  describe('defaults', () => {
    it('sets entryName to main', () => {
      const expected = 'main';
      const input = { mainModule: './src/main.ts' } satisfies Options;

      const actual = resolveOptions(input).entryName;

      expect(actual).toBe(expected);
    });

    it('sets mainExport to default', () => {
      const expected = 'default';
      const input = { mainModule: './src/main.ts' } satisfies Options;

      const actual = resolveOptions(input).mainExport;

      expect(actual).toBe(expected);
    });

    it('sets sideEffectImports to empty array', () => {
      const expected: string[] = [];
      const input = { mainModule: './src/main.ts' } satisfies Options;

      const actual = resolveOptions(input).sideEffectImports;

      expect(actual).toEqual(expected);
    });

    it('sets loadLocalSettings to true', () => {
      const expected = true;
      const input = { mainModule: './src/main.ts' } satisfies Options;

      const actual = resolveOptions(input).loadLocalSettings;

      expect(actual).toBe(expected);
    });

    it('sets debug to false', () => {
      const expected = false;
      const input = { mainModule: './src/main.ts' } satisfies Options;

      const actual = resolveOptions(input).debug;

      expect(actual).toBe(expected);
    });

    it('enables EsbuildEntryInjection by default', () => {
      const expected = true;
      const input = { mainModule: './src/main.ts' } satisfies Options;

      const actual = resolveOptions(input).features[Feature.EsbuildEntryInjection];

      expect(actual).toBe(expected);
    });

    it('enables CjsShimAutoInclude by default', () => {
      const expected = true;
      const input = { mainModule: './src/main.ts' } satisfies Options;

      const actual = resolveOptions(input).features[Feature.CjsShimAutoInclude];

      expect(actual).toBe(expected);
    });
  });

  describe('overrides', () => {
    it('preserves mainModule from input', () => {
      const expected = './src/app.ts';
      const input = { mainModule: './src/app.ts' } satisfies Options;

      const actual = resolveOptions(input).mainModule;

      expect(actual).toBe(expected);
    });

    it('overrides entryName', () => {
      const expected = 'app';
      const input = { mainModule: './src/main.ts', entryName: 'app' } satisfies Options;

      const actual = resolveOptions(input).entryName;

      expect(actual).toBe(expected);
    });

    it('overrides loadLocalSettings to false', () => {
      const expected = false;
      const input = { mainModule: './src/main.ts', loadLocalSettings: false } satisfies Options;

      const actual = resolveOptions(input).loadLocalSettings;

      expect(actual).toBe(expected);
    });

    it('overrides a single feature flag without affecting others', () => {
      const expected = true;
      const input = {
        mainModule: './src/main.ts',
        features: { [Feature.EsbuildEntryInjection]: false },
      } satisfies Options;

      const actual = resolveOptions(input).features[Feature.CjsShimAutoInclude];

      expect(actual).toBe(expected);
    });

    it('applies feature flag override', () => {
      const expected = false;
      const input = {
        mainModule: './src/main.ts',
        features: { [Feature.EsbuildEntryInjection]: false },
      } satisfies Options;

      const actual = resolveOptions(input).features[Feature.EsbuildEntryInjection];

      expect(actual).toBe(expected);
    });
  });
});
