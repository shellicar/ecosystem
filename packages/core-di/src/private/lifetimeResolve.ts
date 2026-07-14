import { createEnvKeyedCache } from './lifetimeContracts';
import type { LifetimeFeature } from './types';

export const createResolveLifetime = (): LifetimeFeature => {
  const passKey = Symbol('pass');
  return {
    facts: { owner: 'pass' },
    contribute: (env) => ({ ...env, [passKey]: {} }),
    getInstance: createEnvKeyedCache(passKey, 'resolve lifetime: no pass handle in env'),
  };
};
