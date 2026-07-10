import { describe, expect, it } from 'vitest';
import { createResolveLifetime } from '../src/private/lifetimeResolve';

const makeCounter = () => {
  let count = 0;
  const build = () => {
    count += 1;
    return { count };
  };
  return { build, getCount: () => count };
};

describe('createResolveLifetime', () => {
  it('throws when resolved with no pass handle in env', () => {
    const feature = createResolveLifetime();
    const token = {};
    const { build } = makeCounter();

    const actual = () => feature.getInstance(token, {}, build);

    expect(actual).toThrow('resolve lifetime: no pass handle in env');
  });

  it('shares one instance within a single contributed pass', () => {
    const feature = createResolveLifetime();
    const token = {};
    const { build } = makeCounter();
    const env = feature.contribute?.({}) ?? {};

    const expected = feature.getInstance(token, env, build);
    const actual = feature.getInstance(token, env, build);

    expect(actual).toBe(expected);
  });

  it('builds a fresh instance on the next contributed pass', () => {
    const feature = createResolveLifetime();
    const token = {};
    const { build, getCount } = makeCounter();
    const passOne = feature.contribute?.({}) ?? {};
    const passTwo = feature.contribute?.({}) ?? {};
    const expected = 2;

    feature.getInstance(token, passOne, build);
    feature.getInstance(token, passTwo, build);
    const actual = getCount();

    expect(actual).toBe(expected);
  });

  it('carries its owner as "pass" in its facts', () => {
    const feature = createResolveLifetime();
    const expected = 'pass';

    const actual = feature.facts.owner;

    expect(actual).toBe(expected);
  });
});
