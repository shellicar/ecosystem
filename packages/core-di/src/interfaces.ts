import type { AbstractNewable, ComposableAbstractBuilder, ComposableNewableBuilder, IForwardBuilder, Lifetime, Newable, ResolveMultipleMode, ServiceDescriptor, ServiceIdentifier, SourceType, ValidationReport } from '@shellicar/core-di-engine';
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

/**
 * A scope's resolution surface. Disposables it resolves are disposed when the
 * scope is disposed (a singleton survives, disposed with the provider). A sync
 * dispose of a scope holding an async-only disposable throws; use `await using`.
 */
export abstract class IScopedProvider extends IResolutionScope implements IDisposable, IAsyncDisposable {
  public abstract readonly Services: IServiceCollection;
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
