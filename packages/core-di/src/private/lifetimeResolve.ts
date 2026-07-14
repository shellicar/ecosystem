import type { CacheKey, LifetimeFeature } from './lifetimeContracts';

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
