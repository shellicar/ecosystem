import type { Lifetime } from './enums';
import { ResolveMultipleMode } from './enums';
import type { AbstractNewable, BuildProviderOptions, InstanceFactory, Newable, ServiceCollectionOptions, ServiceDescriptor, ServiceIdentifier, ServiceModuleType, SourceType, ValidationReport } from './types';

export abstract class IDisposable {
  public abstract [Symbol.dispose](): void;
}

export abstract class IServiceModule {
  public abstract registerServices(services: IServiceCollection): void;
}

export abstract class IResolutionScope {
  /**
   * Resolves a single implementation for the given identifier.
   * @template T The type of service to resolve
   * @param identifier The service identifier
   * @returns The resolved instance
   * @throws {MultipleRegistrationError} When multiple implementations exist (unless {@link ServiceCollectionOptions.registrationMode} is set to {@link ResolveMultipleMode.LastRegistered}).
   * @throws {UnregisteredServiceError} When no implementation exists
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

export abstract class IScopedProvider extends IResolutionScope implements IDisposable {
  public abstract readonly Services: IServiceCollection;
  public abstract [Symbol.dispose](): void;
}

export abstract class IServiceProvider extends IResolutionScope implements IDisposable {
  public abstract readonly Services: IServiceCollection;
  public abstract createScope(): IScopedProvider;
  public abstract [Symbol.dispose](): void;
}

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
   * no `.asSelf()` — supply a factory with `.using()`.
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
   * Runs the wiring diagnostics (intended for CI). Reports problems without
   * throwing; {@link buildProvider} stays lenient unless opted in.
   *
   * To derive the dependency graph for the `Cycle` and `CaptiveDependency`
   * checks, `validate()` **constructs each `@dependsOn`-wired registered class
   * once** (an edge is only recorded at construction). Run it against a
   * throwaway container (e.g. in CI), not one you rely on for lazy or single
   * construction. Factory-built (`using()`) registrations are not constructed
   * and are excluded from the graph checks.
   */
  public abstract validate(): ValidationReport;
  public abstract registerModules(...modules: ServiceModuleType[]): void;
  public abstract overrideLifetime<T extends SourceType>(identifier: ServiceIdentifier<T>, lifetime: Lifetime): void;
  public abstract buildProvider(options?: BuildProviderOptions): IServiceProvider;
  public abstract clone(): IServiceCollection;
  public abstract clone(scoped: true): IServiceCollection;
}

/**
 * The builder for a concrete (newable) registration. `.as()` declares a
 * resolution face and type-checks that the implementation satisfies it; `.asSelf()`
 * declares the concrete itself as a face.
 */
export abstract class INewableServiceBuilder<T extends SourceType> {
  public abstract as<F extends SourceType>(identifier: ServiceIdentifier<F> & (T extends F ? unknown : never)): INewableServiceBuilder<T>;
  public abstract asSelf(): INewableServiceBuilder<T>;
  public abstract using(factory: InstanceFactory<T>): INewableServiceBuilder<T>;
  public abstract singleton(): INewableServiceBuilder<T>;
  public abstract scoped(): INewableServiceBuilder<T>;
  public abstract transient(): INewableServiceBuilder<T>;
}

/**
 * The builder for an abstract registration. It has no `.asSelf()` — an abstract
 * class cannot be built as itself, so identity is declared with `.as()` and the
 * instance is supplied by `.using()`.
 */
export abstract class IAbstractServiceBuilder<T extends SourceType> {
  public abstract as<F extends SourceType>(identifier: ServiceIdentifier<F> & (T extends F ? unknown : never)): IAbstractServiceBuilder<T>;
  // Once a factory supplies the instance, an abstract registration can be built
  // as itself, so `using()` returns the newable-flavoured builder (with asSelf).
  public abstract using(factory: InstanceFactory<T>): INewableServiceBuilder<T>;
  public abstract singleton(): IAbstractServiceBuilder<T>;
  public abstract scoped(): IAbstractServiceBuilder<T>;
  public abstract transient(): IAbstractServiceBuilder<T>;
}

/**
 * The builder for a forward. `.to()` names the target and completes the redirect;
 * a forward has no lifetime, so there is no lifetime verb to chain.
 */
export abstract class IForwardBuilder<S extends SourceType> {
  public abstract to<Target extends SourceType>(target: ServiceIdentifier<Target>): IForwardResult;
}

/**
 * The result of completing a forward. A forward is terminal and has no lifetime,
 * so this exposes nothing to chain — a lifetime verb on it does not typecheck.
 */
export abstract class IForwardResult {}
