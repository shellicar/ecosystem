/**
 * Layer 2 — the contracts between engine and features. Depends on: types.
 *
 * A lifetime is a FEATURE: logic + its own storage, plugged into the
 * provider's resolution boundary. The engine never holds a lifetime's table
 * and never mints a lifetime's handle — a feature brings both and takes them
 * away when uncomposed.
 */
import type { LifetimeName, Token } from './types';

/** The bag of opaque handles travelling down one resolution. */
export type Env = Readonly<Record<symbol, object>>;

export type BuildFn = () => unknown;

export type LifetimeFeature = {
  /** Read-only facts for graph policies (facts.ts). Never consulted by the engine. */
  readonly facts: { readonly owner: string };
  /**
   * The lifetime's logic and storage. `build` constructs-and-wires when the
   * feature decides there is no instance to reuse.
   */
  readonly getInstance: (token: Token, env: Env, build: BuildFn) => unknown;
  /**
   * Contribute handles at the top-level resolve boundary. Called once per
   * top-level resolve — minting a fresh handle here IS per-pass identity.
   */
  readonly contribute?: (env: Env) => Env;
};

export type FeatureSet = Partial<Record<LifetimeName, LifetimeFeature>>;

/** The minimal resolver surface a feature may wrap (e.g. scoped's createScope). */
export type Resolver = {
  resolve<T>(token: Token, extraEnv?: Env): T;
};
