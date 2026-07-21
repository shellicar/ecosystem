import { describe, expect, it } from 'vitest';
import { Strategies } from '../../src/core/strategies';
import { VersionStrategyKind } from '../../src/core/types';

describe('Strategies', () => {
  it('builds an envOverride descriptor', () => {
    const actual = Strategies.envOverride();
    const expected = { kind: VersionStrategyKind.EnvOverride };

    expect(actual).toEqual(expected);
  });

  it('builds a git descriptor carrying the package name', () => {
    const actual = Strategies.git({ packageName: 'pkg-a' });
    const expected = { kind: VersionStrategyKind.Git, packageName: 'pkg-a' };

    expect(actual).toEqual(expected);
  });

  it('builds a gitversion descriptor carrying strict mode', () => {
    const actual = Strategies.gitversion({ strict: true });
    const expected = { kind: VersionStrategyKind.GitVersion, strict: true };

    expect(actual).toEqual(expected);
  });

  it('builds a fallback descriptor carrying its version', () => {
    const actual = Strategies.fallback('1.2.3');
    const expected = { kind: VersionStrategyKind.Fallback, version: '1.2.3' };

    expect(actual).toEqual(expected);
  });

  it('builds a custom descriptor carrying its strategy function', () => {
    const strategy = () => ({ version: '1.0.0-custom', branch: 'main' });

    const actual = Strategies.custom(strategy);
    const expected = { kind: VersionStrategyKind.Custom, strategy };

    expect(actual).toEqual(expected);
  });
});
