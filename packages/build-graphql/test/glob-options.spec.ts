import { describe, expect, it } from 'vitest';
import { resolveGlobOptions } from '../src/core/resolveGlobOptions';

describe('glob options resolution', () => {
  describe('when globOptions.ignore is provided', () => {
    it('uses globOptions.ignore', () => {
      const result = resolveGlobOptions({
        globOptions: {
          ignore: 'hello',
        },
      });

      const actual = result.ignore;
      const expected = 'hello';

      expect(actual).toBe(expected);
    });
  });

  describe('when globOptions.ignore is not provided', () => {
    it('leaves ignore undefined', () => {
      const result = resolveGlobOptions({
        globOptions: {},
      });

      const actual = result.ignore;

      expect(actual).toBeUndefined();
    });
  });

  describe('when globOptions is not provided', () => {
    it('leaves ignore undefined', () => {
      const result = resolveGlobOptions({});

      const actual = result.ignore;

      expect(actual).toBeUndefined();
    });
  });
});
