import type { ServiceIdentifier, SourceType } from '../types';

export type Env = Readonly<Record<symbol, object>>;

export type BuildFn = () => unknown;

export type CacheKey = object;

export type LifetimeFeature = {
  readonly facts: { readonly owner: string };
  readonly getInstance: (key: CacheKey, env: Env, build: BuildFn) => unknown;
  readonly contribute?: (env: Env) => Env;
};

export type Resolver = {
  resolve<T extends SourceType>(token: ServiceIdentifier<T>, extraEnv?: Env): T;
};
