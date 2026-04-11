import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Feature } from '../enums';
import type { Options } from '../types';
import { generateVirtualModule } from './generateVirtualModule';
import { resolveOptions } from './resolveOptions';

const createOptions = (overrides: Partial<Options> = {}) =>
  resolveOptions({
    mainModule: './src/main.ts',
    ...overrides,
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('generateVirtualModule', () => {
  describe('header', () => {
    it('includes generated-at timestamp', () => {
      const expected = true;

      const actual = generateVirtualModule(createOptions(), 'esm').includes('@generated-at 2026-01-01T00:00:00.000Z');

      expect(actual).toBe(expected);
    });
  });

  describe('cjs-shim', () => {
    it('includes cjs-shim import for esm with feature enabled', () => {
      const expected = true;

      const actual = generateVirtualModule(createOptions(), 'esm').includes("import '@shellicar/build-azure-local-settings/cjs-shim';");

      expect(actual).toBe(expected);
    });

    it('excludes cjs-shim import for cjs format', () => {
      const expected = false;

      const actual = generateVirtualModule(createOptions(), 'cjs').includes("import '@shellicar/build-azure-local-settings/cjs-shim';");

      expect(actual).toBe(expected);
    });

    it('excludes cjs-shim import when feature disabled', () => {
      const expected = false;
      const options = createOptions({ features: { [Feature.CjsShimAutoInclude]: false } } satisfies Partial<Options>);

      const actual = generateVirtualModule(options, 'esm').includes("import '@shellicar/build-azure-local-settings/cjs-shim';");

      expect(actual).toBe(expected);
    });
  });

  describe('side effect imports', () => {
    it('includes side effect imports', () => {
      const expected = true;
      const options = createOptions({ sideEffectImports: ['dotenv/config'] });

      const actual = generateVirtualModule(options, 'esm').includes("import 'dotenv/config';");

      expect(actual).toBe(expected);
    });
  });

  describe('main module import', () => {
    it('uses default import for default export', () => {
      const expected = true;

      const actual = generateVirtualModule(createOptions(), 'esm').includes("import main from './src/main.ts';");

      expect(actual).toBe(expected);
    });

    it('uses named import for named export', () => {
      const expected = true;
      const options = createOptions({ mainExport: 'start' });

      const actual = generateVirtualModule(options, 'esm').includes("import { start } from './src/main.ts';");

      expect(actual).toBe(expected);
    });
  });

  describe('loadLocalSettings', () => {
    it('includes loadLocalSettings import when enabled', () => {
      const expected = true;

      const actual = generateVirtualModule(createOptions(), 'esm').includes("import { loadLocalSettings } from '@shellicar/build-azure-local-settings/runtime';");

      expect(actual).toBe(expected);
    });

    it('includes loadLocalSettings call when enabled', () => {
      const expected = true;

      const actual = generateVirtualModule(createOptions(), 'esm').includes('await loadLocalSettings();');

      expect(actual).toBe(expected);
    });

    it('excludes loadLocalSettings when disabled', () => {
      const expected = false;
      const options = createOptions({ loadLocalSettings: false });

      const actual = generateVirtualModule(options, 'esm').includes('loadLocalSettings');

      expect(actual).toBe(expected);
    });
  });

  describe('format wrapping', () => {
    it('wraps async code in IIFE for cjs', () => {
      const expected = true;

      const actual = generateVirtualModule(createOptions(), 'cjs').includes('(async () => {');

      expect(actual).toBe(expected);
    });

    it('uses top-level await for esm', () => {
      const expected = false;

      const actual = generateVirtualModule(createOptions(), 'esm').includes('(async () => {');

      expect(actual).toBe(expected);
    });
  });
});
