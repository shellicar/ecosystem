import { describe, expect, it } from 'vitest';
import { createSingletonLifetime } from '@shellicar/core-di-engine';

const makeCounter = () => {
  let count = 0;
  const build = () => {
    count += 1;
    return { count };
  };
  return { build, getCount: () => count };
};

abstract class IThing {}

describe('createSingletonLifetime', () => {
  it('reuses the same instance for the same token', () => {
    const feature = createSingletonLifetime();
    const token = IThing;
    const { build } = makeCounter();

    const expected = feature.getInstance(token, {}, build);
    const actual = feature.getInstance(token, {}, build);

    expect(actual).toBe(expected);
  });

  it('calls build exactly once for the same token', () => {
    const feature = createSingletonLifetime();
    const token = IThing;
    const { build, getCount } = makeCounter();
    const expected = 1;

    feature.getInstance(token, {}, build);
    feature.getInstance(token, {}, build);
    const actual = getCount();

    expect(actual).toBe(expected);
  });

  it('builds separately for two distinct tokens', () => {
    const feature = createSingletonLifetime();
    abstract class IOther {}
    const tokenA = IThing;
    const tokenB = IOther;
    const { build, getCount } = makeCounter();
    const expected = 2;

    feature.getInstance(tokenA, {}, build);
    feature.getInstance(tokenB, {}, build);
    const actual = getCount();

    expect(actual).toBe(expected);
  });

  it('carries its owner as "provider" in its facts', () => {
    const feature = createSingletonLifetime();
    const expected = 'provider';

    const actual = feature.facts.owner;

    expect(actual).toBe(expected);
  });

  it('contributes no boundary handle: its storage needs none', () => {
    const feature = createSingletonLifetime();

    const actual = feature.contribute;

    expect(actual).toBeUndefined();
  });
});
