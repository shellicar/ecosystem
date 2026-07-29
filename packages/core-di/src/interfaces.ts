import type { AbstractNewable, ComposableAbstractBuilder, ComposableNewableBuilder, IForwardBuilder, IScopedForwardBuilder, Lifetime, Newable, ResolveMultipleMode, ServiceDescriptor, ServiceIdentifier, SourceType, ValidationReport } from '@shellicar/core-di-engine';
import { IResolutionScope } from '@shellicar/core-di-engine';
import type { BuildProviderOptions, ServiceCollectionOptions, ServiceModuleType } from './types';

export abstract class IDisposable {
  public abstract [Symbol.dispose](): void;
}

/** A resource whose teardown must be awaited (`await using` / `Symbol.asyncDispose`). */
export abstract class IAsyncDisposable {
  public abstract [Symbol.asyncDispose](): Promise<void>;
}

export abstract class IServiceModule {
  public abstract registerServices(services: IServiceCollection): void;
}

declare const requiresAScope: unique symbol;
/**
 * A marker no real token carries, so asking the root for one fails to compile. The
 * diagnostic is the name: TypeScript reports the type it could not satisfy and the
 * property missing from it, not any string written inside it.
 */
type RequiresAScope = { readonly [requiresAScope]: true };

/** `RequiresAScope` for a token only a scope can serve, and nothing extra for every other token. */
type ScopeOnly<T> = T extends IScopedProvider ? RequiresAScope : unknown;

/**
 * A scope's resolution surface. Disposables it resolves are disposed when the
 * scope is disposed (a singleton survives, disposed with the provider). A sync
 * dispose of a scope holding an async-only disposable throws; use `await using`.
 */
export abstract class IScopedProvider extends IResolutionScope implements IDisposable, IAsyncDisposable {
  public abstract readonly Services: IScopedServiceCollection;
  /**
   * Opens a nested scope. It starts with the registrations this scope holds at
   * that moment (later additions here don't reach it), holds its own scoped
   * instances, and shares singletons with the whole provider. Each scope is
   * disposed independently.
   */
  public abstract createScope(): IScopedProvider;
  public abstract [Symbol.dispose](): void;
  public abstract [Symbol.asyncDispose](): Promise<void>;
}

/**
 * The provider root. Disposables are disposed at their owner's end: singletons
 * at provider dispose, scope-resolved instances at their scope's. A sync dispose
 * of a provider holding an async-only disposable throws; use `await using`.
 */
export abstract class IServiceProvider extends IResolutionScope implements IDisposable, IAsyncDisposable {
  public abstract readonly Services: IServiceCollection;
  /**
   * Resolves a single implementation, except {@link IScopedProvider}: the root is not
   * a scope, so asking it for one does not typecheck. A scope's own `resolve` is
   * unaffected. Resolving it here anyway (past the types, or through injection) throws
   * {@link ScopeMismatchError}.
   */
  public abstract override resolve<T extends SourceType>(identifier: ServiceIdentifier<T> & ScopeOnly<T>): T;
  public abstract createScope(): IScopedProvider;
  /**
   * Writes a human-readable visualisation of the built dependency graph to
   * `write` (default `console.log`), one line per call: each registered token,
   * its implementation and effective lifetime, its declared `@dependsOn` and
   * forward edges. Reads the static graph derived at build, with no construction.
   */
  public abstract printGraph(write?: (line: string) => void): void;
  public abstract [Symbol.dispose](): void;
  public abstract [Symbol.asyncDispose](): Promise<void>;
}

/**
 * The builder for a concrete (newable) registration. `.as()` / `.asSelf()`
 * declare faces, `.using()` an optional factory, then a lifetime verb; `.eager()`
 * while singleton. `usingAsync` exists only on an async collection.
 */
export type INewableServiceBuilder<T extends SourceType, Async extends boolean = false, Eager extends boolean = false> = ComposableNewableBuilder<T, Lifetime, Async, Eager>;

/**
 * The builder for an abstract registration. It has no `.asSelf()`: an abstract
 * class cannot be built as itself, so identity is declared with `.as()` and the
 * instance is supplied by `.using()` (which returns the newable-flavoured
 * builder, since a factory can build the implementation as itself).
 */
export type IAbstractServiceBuilder<T extends SourceType, Async extends boolean = false, Eager extends boolean = false> = ComposableAbstractBuilder<T, Lifetime, Async, Eager>;

export abstract class IServiceCollection {
  public abstract readonly options: ServiceCollectionOptions;
  public abstract get<T extends SourceType>(identifier: ServiceIdentifier<T>): ServiceDescriptor<T>[];
  /**
   * Registers a concrete (newable) implementation. The returned builder declares
   * identity with `.as()` / `.asSelf()`, an optional factory with `.using()`, and
   * a lifetime verb.
   * @param implementation The concrete class to build.
   * @throws {InvalidImplementationError} When the implementation is null or undefined.
   */
  public abstract register<T extends SourceType>(implementation: Newable<T>): INewableServiceBuilder<T>;
  /**
   * Registers an abstract implementation. An abstract class serves as the type
   * contract and cannot be built by zero-arg `new`, so the returned builder has
   * no `.asSelf()`: supply a factory with `.using()`.
   * @param implementation The abstract class to register.
   * @throws {InvalidImplementationError} When the implementation is null or undefined.
   */
  public abstract register<T extends SourceType>(implementation: AbstractNewable<T>): IAbstractServiceBuilder<T>;
  /**
   * Forwards a source token to another registration: resolving the source is
   * resolving the target. A forward is a pure redirect with no lifetime of its own.
   * @param source The token to redirect.
   * @throws {InvalidServiceIdentifierError} When the source is null or undefined.
   */
  public abstract forward<S extends SourceType>(source: ServiceIdentifier<S>): IForwardBuilder<S>;
  /**
   * Runs the wiring diagnostics (intended for CI): reads the static dependency
   * graph with no construction and reports problems without throwing.
   * {@link buildProvider} stays lenient unless opted in.
   *
   * An opaque factory's own inline `scope.resolve(...)` has no static edge to
   * read, so it is invisible here; a singleton capturing a scoped instance that
   * way is caught by `runtimeCaptivePolicy` (default `Throw`), at resolve.
   */
  public abstract validate(): ValidationReport;
  public abstract registerModules(...modules: ServiceModuleType[]): void;
  /**
   * Rewrites the lifetime of every non-forward registration under `identifier`.
   * Pre-build only: a provider's plans are derived at build, so overriding
   * a lifetime after `buildProvider()` has been called throws.
   */
  public abstract overrideLifetime<T extends SourceType>(identifier: ServiceIdentifier<T>, lifetime: Lifetime): void;
  public abstract buildProvider(options?: BuildProviderOptions): IServiceProvider;
  public abstract clone(): IServiceCollection;
  public abstract clone(scoped: true): IServiceCollection;
}

/**
 * The builder for a concrete (newable) registration inside a scope: everything
 * {@link INewableServiceBuilder} has, plus `.shadow()` — marks the registration as
 * allowed to win over an ancestor scope's registration of the same token, instead
 * of colliding with it as a genuine duplicate.
 */
export type IScopedNewableServiceBuilder<T extends SourceType, Async extends boolean = false, Eager extends boolean = false> = ComposableNewableBuilder<T, Lifetime, Async, Eager, false, true>;

/** The abstract-registration equivalent of {@link IScopedNewableServiceBuilder}. */
export type IScopedAbstractServiceBuilder<T extends SourceType, Async extends boolean = false, Eager extends boolean = false> = ComposableAbstractBuilder<T, Lifetime, Async, Eager, false, true>;

/**
 * A scope's collection: identical to {@link IServiceCollection}, except `register()`
 * and `forward()` return the shadow-capable builders. Only reachable through
 * {@link IScopedProvider.Services} — a root collection's `register()`/`forward()`
 * never carry `.shadow()`, at the type level or at runtime.
 */
export abstract class IScopedServiceCollection extends IServiceCollection {
  public abstract register<T extends SourceType>(implementation: Newable<T>): IScopedNewableServiceBuilder<T>;
  public abstract register<T extends SourceType>(implementation: AbstractNewable<T>): IScopedAbstractServiceBuilder<T>;
  public abstract forward<S extends SourceType>(source: ServiceIdentifier<S>): IScopedForwardBuilder<S>;
}

/**
 * The collection surface of `createServiceCollection({ async: true })`. Only here
 * do the builders carry `usingAsync` and the collection `buildProviderAsync`; the
 * synchronous `buildProvider` is absent, so async factories need the async build.
 */
export type IAsyncServiceCollection = {
  readonly options: ServiceCollectionOptions;
  get<T extends SourceType>(identifier: ServiceIdentifier<T>): ServiceDescriptor<T>[];
  /** Registers a concrete (newable) implementation. The returned builder carries `usingAsync`. */
  register<T extends SourceType>(implementation: Newable<T>): INewableServiceBuilder<T, true>;
  /** Registers an abstract implementation. The returned builder carries `usingAsync`. */
  register<T extends SourceType>(implementation: AbstractNewable<T>): IAbstractServiceBuilder<T, true>;
  forward<S extends SourceType>(source: ServiceIdentifier<S>): IForwardBuilder<S>;
  validate(): ValidationReport;
  registerModules(...modules: ServiceModuleType[]): void;
  overrideLifetime<T extends SourceType>(identifier: ServiceIdentifier<T>, lifetime: Lifetime): void;
  /**
   * The async build boundary: awaits async singleton
   * factories (`usingAsync`) in topological order, so their instances are
   * settled and every subsequent `resolve()` is synchronous.
   */
  buildProviderAsync(options?: BuildProviderOptions): Promise<IServiceProvider>;
  clone(): IAsyncServiceCollection;
  clone(scoped: true): IAsyncServiceCollection;
};
