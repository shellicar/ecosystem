import { describe, expect, it } from 'vitest';
import { resolveGlobOptions } from '../src/core/resolveGlobOptions';
import { resolveOptions } from '../src/core/resolveOptions';

describe('glob options resolution', () => {
  describe('when globOptions.ignore is provided', () => {
    it('uses globOptions.ignore in place of the default', () => {
      const result = resolveGlobOptions({
        globOptions: {
          ignore: 'hello',
        },
      });

      const actual = result.ignore;
      const expected = 'hello';

      expect(actual).toBe(expected);
    });

    it('uses an empty globOptions.ignore in place of the default', () => {
      const result = resolveGlobOptions({
        globOptions: {
          ignore: [],
        },
      });

      const actual = result.ignore;
      const expected: string[] = [];

      expect(actual).toEqual(expected);
    });
  });

  describe('when globOptions.ignore is not provided', () => {
    it('ignores node_modules', () => {
      const result = resolveGlobOptions({
        globOptions: {},
      });

      const actual = result.ignore;
      const expected = '**/node_modules/**';

      expect(actual).toBe(expected);
    });

    it('passes other globOptions through', () => {
      const result = resolveGlobOptions({
        globOptions: {
          dot: true,
        },
      });

      const actual = result.dot;

      expect(actual).toBe(true);
    });
  });

  describe('when globOptions is not provided', () => {
    it('ignores node_modules', () => {
      const result = resolveGlobOptions({});

      const actual = result.ignore;
      const expected = '**/node_modules/**';

      expect(actual).toBe(expected);
    });
  });
});

describe('resolved options', () => {
  describe('when no options are provided', () => {
    it('ignores node_modules', () => {
      const actual = resolveOptions({}).globOptions.ignore;
      const expected = '**/node_modules/**';

      expect(actual).toBe(expected);
    });
  });

  describe('when globOptions is provided without ignore', () => {
    it('ignores node_modules', () => {
      const actual = resolveOptions({ globOptions: { dot: true } }).globOptions.ignore;
      const expected = '**/node_modules/**';

      expect(actual).toBe(expected);
    });
  });

  describe('when globOptions.ignore is provided', () => {
    it('uses globOptions.ignore in place of the default', () => {
      const actual = resolveOptions({ globOptions: { ignore: ['**/generated/**'] } }).globOptions.ignore;
      const expected = ['**/generated/**'];

      expect(actual).toEqual(expected);
    });
  });
});
