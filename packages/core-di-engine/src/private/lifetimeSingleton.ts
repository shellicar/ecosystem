import type { CacheKey, LifetimeFeature } from './types';

export const createSingletonLifetime = (): LifetimeFeature => {
  const table = new Map<CacheKey, unknown>();
  return {
    facts: { owner: 'provider' },
    getInstance: (key, _env, build) => {
      if (!table.has(key)) {
        table.set(key, build());
      }
      return table.get(key);
    },
  };
};
