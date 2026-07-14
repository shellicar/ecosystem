import { createEnvKeyedCache } from './lifetimeContracts';
import type { Env, LifetimeFeature, ScopedLifetime } from './types';

export const createScopedLifetime = (): ScopedLifetime => {
  const scopeKey = Symbol('scope');
  const feature: LifetimeFeature = {
    facts: { owner: 'scope' },
    getInstance: createEnvKeyedCache(scopeKey, 'scoped lifetime: resolution outside a scope'),
  };
  const beginScope = (): Env => ({ [scopeKey]: {} });
  return { feature, beginScope };
};
