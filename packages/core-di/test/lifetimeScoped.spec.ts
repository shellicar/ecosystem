import { describe, expect, it } from 'vitest';
import type { ServiceIdentifier, SourceType } from '../src/types';
import type { Env, Resolver } from '../src/private/lifetimeContracts';
import { createScopedLifetime } from '../src/private/lifetimeScoped';

const makeCounter = () => {
  let count = 0;
  const build = () => {
    count += 1;
    return { count };
  };
  return { build, getCount: () => count };
};

const wrapResolver = (feature: ReturnType<typeof createScopedLifetime>['feature'], build: () => unknown): Resolver => ({
  resolve<T extends SourceType>(token: ServiceIdentifier<T>, extraEnv?: Env): T {
    return feature.getInstance(token, extraEnv ?? {}, build) as T;
  },
});

abstract class IThing {}

describe('createScopedLifetime', () => {
  it('throws when resolved with no scope handle in env', () => {
    const { feature } = createScopedLifetime();
    const token = IThing;
    const { build } = makeCounter();

    const actual = () => feature.getInstance(token, {}, build);

    expect(actual).toThrow('scoped lifetime: resolution outside a scope');
  });

  it('shares one instance across resolves within the same scope', () => {
    const { feature, createScope } = createScopedLifetime();
    const token = IThing;
    const { build } = makeCounter();
    const scope = createScope(wrapResolver(feature, build));

    const expected = scope.resolve(token);
    const actual = scope.resolve(token);

    expect(actual).toBe(expected);
  });

  it('builds a fresh instance for a different scope', () => {
    const { feature, createScope } = createScopedLifetime();
    const token = IThing;
    const { build, getCount } = makeCounter();
    const resolver = wrapResolver(feature, build);
    const scope1 = createScope(resolver);
    const scope2 = createScope(resolver);
    const expected = 2;

    scope1.resolve(token);
    scope2.resolve(token);
    const actual = getCount();

    expect(actual).toBe(expected);
  });

  it('carries its owner as "scope" in its facts', () => {
    const { feature } = createScopedLifetime();
    const expected = 'scope';

    const actual = feature.facts.owner;

    expect(actual).toBe(expected);
  });
});
