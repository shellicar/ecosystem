import type { CacheKey, LifetimeFeature } from './lifetimeContracts';

/**
 * Resolve: one instance per top-level resolve ("pass"), fresh on the next.
 * The contributor mints a fresh handle at each boundary; storage keys on
 * that handle, so composing this feature out means no pass handle is ever
 * created anywhere.
 */
export const createResolveLifetime = (): LifetimeFeature => {
  const passKey = Symbol('pass');
  const tables = new WeakMap<object, Map<CacheKey, unknown>>();
  return {
    facts: { owner: 'pass' },
    contribute: (env) => ({ ...env, [passKey]: {} }),
    getInstance: (key, env, build) => {
      const handle = env[passKey];
      if (handle === undefined) {
        throw new Error('resolve lifetime: no pass handle in env');
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
};
