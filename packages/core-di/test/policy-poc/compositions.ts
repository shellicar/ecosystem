/**
 * Layer 4 — the compositions. Depends on: the three lifetime features.
 *
 * core-di is the full set; lite is [singleton] only — and lite has no
 * createScope, because createScope belongs to the scoped feature.
 */
import type { FeatureSet } from './contracts';
import { createResolveLifetime } from './lifetime-resolve';
import { createScopedLifetime, type ScopedLifetime } from './lifetime-scoped';
import { createSingletonLifetime } from './lifetime-singleton';

export type FullComposition = {
  readonly features: FeatureSet;
  readonly createScope: ScopedLifetime['createScope'];
};

export const createFullSet = (): FullComposition => {
  const scoped = createScopedLifetime();
  return {
    features: {
      singleton: createSingletonLifetime(),
      scoped: scoped.feature,
      resolve: createResolveLifetime(),
    },
    createScope: scoped.createScope,
  };
};

export type LiteComposition = {
  readonly features: FeatureSet;
};

export const createLiteSet = (): LiteComposition => {
  return {
    features: { singleton: createSingletonLifetime() },
  };
};
