import type { ServiceIdentifier, SourceType } from '../types';
import type { CacheKey, Env, LifetimeFeature, Resolver } from './lifetimeContracts';

export type ScopedLifetime = {
  readonly feature: LifetimeFeature;
  readonly createScope: (resolver: Resolver) => { resolve<T extends SourceType>(token: ServiceIdentifier<T>): T };
  /**
   * Mint a fresh scope handle as an env fragment. The engine threads this as
   * the base env of every resolve in the scope, so the scoped feature keys its
   * table on it — one table per scope. This is the scope boundary as a value
   * the engine can hold, alongside `createScope`'s bound-resolver form.
   */
  readonly beginScope: () => Env;
};

/**
 * Scoped: shared within one scope, fresh per scope. Brings BOTH the lifetime
 * and `createScope` — the scope boundary is this feature's own concept, so
 * the verb that opens one ships with it. A composition without `scoped`
 * genuinely has no `createScope`.
 */
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
