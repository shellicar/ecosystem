import type { AbstractNewable, ComposableAbstractBuilder, ComposableNewableBuilder, IForwardBuilder, IResolutionScope, Lifetime, Newable, ServiceIdentifier, SourceType, ValidationReport } from '@shellicar/core-di-engine';

/**
 * Lite's builder surface is core-di's grammar over the singleton-only lifetime
 * set: `.as()` / `.asSelf()` declare faces, `.using()` an optional factory, and
 * `.singleton()` is the only lifetime verb (also the default, so it may be
 * omitted). Shared identity rides on the register() call: every face declared
 * from one call resolves to the same instance, factory or not.
 */
export type INewableServiceBuilder<T extends SourceType> = ComposableNewableBuilder<T, Lifetime.Singleton, false>;
export type IAbstractServiceBuilder<T extends SourceType> = ComposableAbstractBuilder<T, Lifetime.Singleton, false>;

/** The provider surface: resolution only. Everything was constructed at build. */
export type IServiceProvider = Pick<IResolutionScope, 'resolve' | 'resolveAll'>;

export type IServiceCollection = {
  /** Registers a concrete (newable) implementation. */
  register<T extends SourceType>(implementation: Newable<T>): INewableServiceBuilder<T>;
  /** Registers an abstract implementation: declare identity with `.as()`, supply the instance with `.using()`. */
  register<T extends SourceType>(implementation: AbstractNewable<T>): IAbstractServiceBuilder<T>;
  /** Forwards a source token to another registration: resolving the source is resolving the target. */
  forward<S extends SourceType>(source: ServiceIdentifier<S>): IForwardBuilder<S>;
  /** Reads the static graph and reports wiring problems without constructing anything. Run it in CI. */
  validate(): ValidationReport;
  /**
   * Constructs every registration up front (all singletons, in dependency
   * order) and fails fast: a wiring or construction error throws here, not at
   * some later resolve. The returned provider is pure lookup.
   */
  buildProvider(): IServiceProvider;
};
