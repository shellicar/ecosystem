import type { LifetimeFeature } from './lifetimeContracts';

/**
 * Singleton: one instance for the whole provider. Storage is a closure
 * created per composition — the feature instance's life IS the provider's
 * life, so no boundary handle is needed at all.
 */
export const createSingletonLifetime = (): LifetimeFeature => {
  const table = new Map<object, unknown>();
  return {
    facts: { owner: 'provider' },
    getInstance: (token, _env, build) => {
      if (!table.has(token)) {
        table.set(token, build());
      }
      return table.get(token);
    },
  };
};
