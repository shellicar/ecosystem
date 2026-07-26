import type { ServiceIdentifier, SourceType } from './types';

/**
 * The resolution surface the engine hands to factories and scopes. Defined here,
 * once: core-di re-exports it (and extends it into its provider surfaces), so a
 * single abstract class carries the identity across both packages.
 */
export abstract class IResolutionScope {
  /**
   * Resolves a single implementation for the given identifier.
   * @template T The type of service to resolve
   * @param identifier The service identifier
   * @returns The resolved instance
   */
  public abstract resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T;

  /**
   * Resolves all implementations for the given identifier.
   * @template T The type of service to resolve
   * @param identifier The service identifier
   * @returns Array of resolved instances
   */
  public abstract resolveAll<T extends SourceType>(identifier: ServiceIdentifier<T>): T[];
}

/**
 * The builder for a forward. `.to()` names the target and completes the redirect;
 * a forward has no lifetime, so there is no lifetime verb to chain.
 */
export abstract class IForwardBuilder<_S extends SourceType> {
  public abstract to<Target extends SourceType>(target: ServiceIdentifier<Target>): IForwardResult;
}

/**
 * The result of completing a forward. A forward is terminal and has no lifetime,
 * so this exposes nothing to chain; a lifetime verb on it does not typecheck.
 */
export abstract class IForwardResult {}

/**
 * The builder for a forward inside a scope: everything {@link IForwardBuilder} has,
 * plus `.shadow()` — marks the forward about to be completed as allowed to win over
 * an ancestor scope's registration of the same source token. `.shadow()` must be
 * called before `.to()`: the flag is fixed at registration, not mutated on the
 * descriptor afterward, so a scope created between `.to()` and a later `.shadow()`
 * call can never observe it flip retroactively. A separate (non-generic) class
 * rather than a `Scoped` parameter on `IForwardBuilder` itself: TypeScript infers a
 * class type parameter used only inside a conditional type as invariant, which
 * would make `IForwardBuilder<S, true>` fail to satisfy `IForwardBuilder<S, false>`
 * even though the capability is a pure superset.
 */
export abstract class IScopedForwardBuilder<S extends SourceType> extends IForwardBuilder<S> {
  public abstract shadow(): IScopedForwardBuilder<S>;
}
