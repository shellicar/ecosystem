import type { CacheKey, LifetimeFeature } from './types';

// The scoped and per-resolve lifetimes share one caching shape: a table of built
// instances keyed off a handle carried in the env. Only which symbol names the handle
// differs, so the table logic lives here once.
export const createEnvKeyedCache = (envKey: symbol, missingHandleMessage: string): LifetimeFeature['getInstance'] => {
  const tables = new WeakMap<object, Map<CacheKey, unknown>>();
  return (key, env, build) => {
    const handle = env[envKey];
    if (handle === undefined) {
      throw new Error(missingHandleMessage);
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
  };
};
