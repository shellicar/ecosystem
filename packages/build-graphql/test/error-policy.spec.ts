import { describe, expect, it } from 'vitest';
import { resolveErrorPolicy } from '../src/core/resolveErrorPolicy';
import { ErrorPolicy } from '../src/enums';

describe('error policy resolution', () => {
  describe('when errorPolicy is provided', () => {
    it('uses ErrorPolicy.Abort even if ignoreErrors is true', () => {
      const actual = resolveErrorPolicy({
        errorPolicy: ErrorPolicy.Abort,
        ignoreErrors: true,
      });

      const expected = ErrorPolicy.Abort;

      expect(actual).toBe(expected);
    });

    it('uses ErrorPolicy.Ignore when explicitly set', () => {
      const actual = resolveErrorPolicy({
        errorPolicy: ErrorPolicy.Ignore,
      });

      const expected = ErrorPolicy.Ignore;

      expect(actual).toBe(expected);
    });
  });

  describe('when errorPolicy is not provided', () => {
    describe('and ignoreErrors is true', () => {
      it('resolves to ErrorPolicy.Ignore', () => {
        const actual = resolveErrorPolicy({
          ignoreErrors: true,
        });

        const expected = ErrorPolicy.Ignore;

        expect(actual).toBe(expected);
      });
    });

    describe('and ignoreErrors is false', () => {
      it('resolves to ErrorPolicy.Abort', () => {
        const actual = resolveErrorPolicy({
          ignoreErrors: false,
        });

        const expected = ErrorPolicy.Abort;

        expect(actual).toBe(expected);
      });
    });

    describe('and ignoreErrors is undefined', () => {
      it('defaults to ErrorPolicy.Abort', () => {
        const actual = resolveErrorPolicy({});

        const expected = ErrorPolicy.Abort;

        expect(actual).toBe(expected);
      });
    });
  });
});
