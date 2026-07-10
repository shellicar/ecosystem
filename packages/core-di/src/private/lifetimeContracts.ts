/**
 * The contract between the boundary engine (Phase 13) and a lifetime
 * feature. A lifetime is "which table holds the instance, and who owns the
 * table" — logic plus its own storage, optionally contributing a handle at
 * the resolution boundary. The engine never holds a lifetime's table and
 * never mints a lifetime's handle; a feature brings both, and removing the
 * feature removes them with it (decisions.md §8).
 */

import type { ServiceIdentifier, SourceType } from '../types';

/** A per-resolution bag of opaque handles, threaded down one resolve call. */
export type Env = Readonly<Record<symbol, object>>;

/** Constructs the instance for a node that has no cached value to reuse yet. */
export type BuildFn = () => unknown;

export type LifetimeFeature = {
  /** Read-only facts for graph policies (decisions.md §8). Never read by the engine itself. */
  readonly facts: { readonly owner: string };
  /**
   * The feature's logic and storage: reuse a cached instance for `token`, or
   * call `build` and cache what it returns.
   */
  readonly getInstance: (token: ServiceIdentifier<SourceType>, env: Env, build: BuildFn) => unknown;
  /**
   * Contribute a handle at the top-level resolve boundary. Called once per
   * top-level resolve — minting a fresh handle here is what gives a feature
   * keyed on it the meaning of "one pass".
   */
  readonly contribute?: (env: Env) => Env;
};

/** The minimal resolver surface a feature may wrap (e.g. scoped's `createScope`). */
export type Resolver = {
  resolve<T extends SourceType>(token: ServiceIdentifier<T>, extraEnv?: Env): T;
};
