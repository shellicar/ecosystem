/**
 * Layer 3 — the resolve lifetime. Depends on: types, contracts.
 *
 * The "pass" belongs HERE, not to the engine: this feature's contributor mints
 * a fresh handle at each top-level resolve boundary, and its policy keys its
 * storage on that handle. Compose this feature out and no pass handle is ever
 * created anywhere.
 */
import type { LifetimeFeature } from './contracts';
import type { Token } from './types';

export const createResolveLifetime = (): LifetimeFeature => {
  const passKey = Symbol('pass');
  const tables = new WeakMap<object, Map<Token, unknown>>();
  return {
    facts: { owner: 'pass' },
    contribute: (env) => ({ ...env, [passKey]: {} }),
    getInstance: (token, env, build) => {
      const handle = env[passKey];
      if (handle === undefined) {
        throw new Error('resolve lifetime: no pass handle in env');
      }
      let table = tables.get(handle);
      if (table === undefined) {
        table = new Map();
        tables.set(handle, table);
      }
      if (!table.has(token)) {
        table.set(token, build());
      }
      return table.get(token);
    },
  };
};
