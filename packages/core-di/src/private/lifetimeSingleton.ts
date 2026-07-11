import type { CacheKey, LifetimeFeature } from './lifetimeContracts';

/**
 * Singleton: one instance for the whole provider. Storage is a closure
 * created per composition — the feature instance's life IS the provider's
 * life, so no boundary handle is needed at all.
 */
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
