import type { BuildOptions } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { injectEntryPoint } from './injectEntryPoint';

describe('injectEntryPoint', () => {
  describe('array entryPoints', () => {
    it('appends virtual module id to existing array', () => {
      const expected = ['src/index.ts', 'virtual:azure-local-settings/main'];
      const options = { entryPoints: ['src/index.ts'] } satisfies BuildOptions;

      injectEntryPoint(options, 'main', 'virtual:azure-local-settings/main');

      const actual = options.entryPoints;
      expect(actual).toEqual(expected);
    });

    it('does not mutate the original array', () => {
      const expected = ['src/index.ts'];
      const original = ['src/index.ts'];
      const options = { entryPoints: original } satisfies BuildOptions;

      injectEntryPoint(options, 'main', 'virtual:azure-local-settings/main');

      const actual = original;
      expect(actual).toEqual(expected);
    });
  });

  describe('object entryPoints', () => {
    it('adds entry with name as key', () => {
      const expected = { index: 'src/index.ts', main: 'virtual:azure-local-settings/main' };
      const options = { entryPoints: { index: 'src/index.ts' } } satisfies BuildOptions;

      injectEntryPoint(options, 'main', 'virtual:azure-local-settings/main');

      const actual = options.entryPoints;
      expect(actual).toEqual(expected);
    });
  });

  describe('undefined entryPoints', () => {
    it('creates object with entry name as key', () => {
      const expected = { main: 'virtual:azure-local-settings/main' };
      const options: BuildOptions = {};

      injectEntryPoint(options, 'main', 'virtual:azure-local-settings/main');

      const actual = options.entryPoints;
      expect(actual).toEqual(expected);
    });
  });
});
