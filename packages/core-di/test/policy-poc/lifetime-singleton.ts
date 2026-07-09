/**
 * Layer 3 — the singleton lifetime. Depends on: types, contracts.
 *
 * Storage is a closure created per provider composition — the feature
 * instance's life IS the provider's life, so no handle is needed at all.
 */
import type { LifetimeFeature } from './contracts';
import type { Token } from './types';

export const createSingletonLifetime = (): LifetimeFeature => {
  const table = new Map<Token, unknown>();
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
