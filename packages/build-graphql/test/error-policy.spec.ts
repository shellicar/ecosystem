import { describe, expect, it } from 'vitest';
import { resolveErrorPolicy } from '../src/core/resolveErrorPolicy';
import { ErrorPolicy } from '../src/enums';

describe('error policy resolution', () => {
  describe('when errorPolicy is provided', () => {
    it('uses ErrorPolicy.Abort when explicitly set', () => {
      const actual = resolveErrorPolicy({
        errorPolicy: ErrorPolicy.Abort,
      });

      const expected = ErrorPolicy.Abort;

      expect(actual).toBe(expected);
    });

    it('uses ErrorPolicy.Report when explicitly set', () => {
      const actual = resolveErrorPolicy({
        errorPolicy: ErrorPolicy.Report,
      });

      const expected = ErrorPolicy.Report;

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
    it('defaults to ErrorPolicy.Abort', () => {
      const actual = resolveErrorPolicy({});

      const expected = ErrorPolicy.Abort;

      expect(actual).toBe(expected);
    });
  });
});
