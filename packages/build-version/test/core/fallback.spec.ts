import { describe, expect, it } from 'vitest';
import { createFallbackStrategy } from '../../src/core/fallback';

describe('createFallbackStrategy', () => {
  it('never declines', () => {
    const strategy = createFallbackStrategy('0.1.0');

    const actual = strategy();

    expect(actual).not.toBeNull();
  });

  it('reports the configured fallback version', () => {
    const strategy = createFallbackStrategy('1.2.3');

    const actual = strategy()?.version;
    const expected = '1.2.3';

    expect(actual).toBe(expected);
  });
});
