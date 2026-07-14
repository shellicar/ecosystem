import type { ServiceIdentifier, SourceType } from '../types';
import type { CacheKey, Env, LifetimeFeature, Resolver } from './lifetimeContracts';

export type ScopedLifetime = {
  readonly feature: LifetimeFeature;
  readonly createScope: (resolver: Resolver) => { resolve<T extends SourceType>(token: ServiceIdentifier<T>): T };
  readonly beginScope: () => Env;
};

export const createScopedLifetime = (): ScopedLifetime => {
  const scopeKey = Symbol('scope');
  const tables = new WeakMap<object, Map<CacheKey, unknown>>();
  const feature: LifetimeFeature = {
    facts: { owner: 'scope' },
    getInstance: (key, env, build) => {
      const handle = env[scopeKey];
      if (handle === undefined) {
        throw new Error('scoped lifetime: resolution outside a scope');
      }
      let table = tables.get(handle);
      if (table === undefined) {
        table = new Map();
        tables.set(handle, table);
      }
      if (!table.has(key)) {
        table.set(key, build());
      }
      return table.get(key);
    },
  };
  const createScope = (resolver: Resolver) => {
    const handle = {};
    const extraEnv: Env = { [scopeKey]: handle };
    return { resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolver.resolve<T>(token, extraEnv) };
  };
  const beginScope = (): Env => ({ [scopeKey]: {} });
  return { feature, createScope, beginScope };
};
