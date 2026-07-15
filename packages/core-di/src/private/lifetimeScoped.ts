import { createEnvKeyedCache } from './lifetimeContracts';
import type { Env, ScopedLifetime } from './types';

export const createScopedLifetime = (): ScopedLifetime => {
  const scopeKey = Symbol('scope');
  return {
    facts: { owner: 'scope' },
    getInstance: createEnvKeyedCache(scopeKey, 'scoped lifetime: resolution outside a scope'),
    // beginScope is what marks this feature as boundary-opening: the engine derives
    // createScope from its presence rather than from the feature's name.
    beginScope: (): Env => ({ [scopeKey]: {} }),
  };
};
