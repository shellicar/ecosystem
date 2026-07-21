import { describe, expect, it } from 'vitest';
import { resolveStrategy } from '../../src/core/resolveStrategy';
import { Strategies } from '../../src/core/strategies';
import type { ILogger } from '../../src/core/types';

const createFakeLogger = (): ILogger => ({
  debug: () => {},
  error: () => {},
});

describe('resolveStrategy', () => {
  it('resolves an envOverride descriptor to a working strategy', () => {
    const strategy = resolveStrategy(Strategies.envOverride(), createFakeLogger());

    const actual = typeof strategy;
    const expected = 'function';

    expect(actual).toBe(expected);
  });

  it('resolves a fallback descriptor to a strategy reporting its configured version', () => {
    const strategy = resolveStrategy(Strategies.fallback('1.2.3'), createFakeLogger());

    const actual = strategy()?.version;
    const expected = '1.2.3';

    expect(actual).toBe(expected);
  });

  it('resolves a git descriptor to a callable strategy', () => {
    const strategy = resolveStrategy(Strategies.git({ packageName: 'pkg-a' }), createFakeLogger());

    const actual = typeof strategy;
    const expected = 'function';

    expect(actual).toBe(expected);
  });

  it('resolves a gitversion descriptor to a callable strategy', () => {
    const strategy = resolveStrategy(Strategies.gitversion(), createFakeLogger());

    const actual = typeof strategy;
    const expected = 'function';

    expect(actual).toBe(expected);
  });

  it('resolves a custom descriptor to the wrapped strategy function unchanged', () => {
    const customStrategy = () => ({ version: '1.0.0-custom', branch: 'main' });

    const resolved = resolveStrategy(Strategies.custom(customStrategy), createFakeLogger());

    const actual = resolved;
    const expected = customStrategy;

    expect(actual).toBe(expected);
  });
});
