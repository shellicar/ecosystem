import { createScopedLifetime } from '../src';
import { describe, expect, it } from 'vitest';

const makeCounter = () => {
  let count = 0;
  const build = () => {
    count += 1;
    return { count };
  };
  return { build, getCount: () => count };
};

abstract class IThing {}

describe('createScopedLifetime', () => {
  it('throws when resolved with no scope handle in env', () => {
    const feature = createScopedLifetime();
    const token = IThing;
    const { build } = makeCounter();

    const actual = () => feature.getInstance(token, {}, build);

    expect(actual).toThrow('scoped lifetime: resolution outside a scope');
  });

  it('shares one instance across resolves within the same scope', () => {
    const feature = createScopedLifetime();
    const token = IThing;
    const { build } = makeCounter();
    const env = feature.beginScope();

    const expected = feature.getInstance(token, env, build);
    const actual = feature.getInstance(token, env, build);

    expect(actual).toBe(expected);
  });

  it('builds a fresh instance for a different scope', () => {
    const feature = createScopedLifetime();
    const token = IThing;
    const { build, getCount } = makeCounter();
    const env1 = feature.beginScope();
    const env2 = feature.beginScope();
    const expected = 2;

    feature.getInstance(token, env1, build);
    feature.getInstance(token, env2, build);
    const actual = getCount();

    expect(actual).toBe(expected);
  });

  it('carries its owner as "scope" in its facts', () => {
    const feature = createScopedLifetime();
    const expected = 'scope';

    const actual = feature.facts.owner;

    expect(actual).toBe(expected);
  });
});
