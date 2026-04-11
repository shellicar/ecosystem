import { describe, expect, it } from 'vitest';
import { resolveGlobOptions } from '../src/core/resolveGlobOptions';

describe('glob options resolution', () => {
  describe('when globOptions.ignore is provided', () => {
    it('uses globOptions.ignore even if globIgnore is set', () => {
      const result = resolveGlobOptions({
        globOptions: {
          ignore: 'hello',
        },
        globIgnore: 'world',
      });

      const actual = result.ignore;
      const expected = 'hello';

      expect(actual).toBe(expected);
    });

    describe('and globIgnore is set', () => {
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
  });

  describe('when globOptions.ignore is not provided', () => {
    describe('and globIgnore is set', () => {
      it('uses to globIgnore', () => {
        const result = resolveGlobOptions({
          globIgnore: 'world',
        });

        const actual = result.ignore;
        const expected = 'world';

        expect(actual).toBe(expected);
      });
    });
  });
});
