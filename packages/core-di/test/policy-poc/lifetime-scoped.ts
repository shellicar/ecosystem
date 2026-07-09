/**
 * Layer 3 — the scoped lifetime. Depends on: types, contracts.
 *
 * Brings BOTH the lifetime and `createScope`: the scope boundary is this
 * feature's concept, so the verb that opens one ships with it. A composition
 * without scoped genuinely has no createScope — the honest reduction.
 */
import type { Env, LifetimeFeature, Resolver } from './contracts';
import type { Token } from './types';

export type ScopedLifetime = {
  readonly feature: LifetimeFeature;
  readonly createScope: (resolver: Resolver) => { resolve<T>(token: Token): T };
};

export const createScopedLifetime = (): ScopedLifetime => {
  const scopeKey = Symbol('scope');
  const tables = new WeakMap<object, Map<Token, unknown>>();
  const feature: LifetimeFeature = {
    facts: { owner: 'scope' },
    getInstance: (token, env, build) => {
      const handle = env[scopeKey];
      if (handle === undefined) {
        throw new Error('scoped lifetime: resolution outside a scope');
      }
      let table = tables.get(handle);
      if (table === undefined) {
        table = new Map();
        tables.set(handle, table);
      }
      if (!table.has(token)) {
        table.set(token, build());
      }
      return table.get(token);
    },
  };
  const createScope = (resolver: Resolver) => {
    const handle = {};
    const extraEnv: Env = { [scopeKey]: handle };
    return { resolve: <T>(token: Token): T => resolver.resolve<T>(token, extraEnv) };
  };
  return { feature, createScope };
};
