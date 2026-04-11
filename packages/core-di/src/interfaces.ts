import type { Lifetime } from './enums';
import { ResolveMultipleMode } from './enums';
import type { EnsureObject, ServiceBuilderOptions, ServiceCollectionOptions, ServiceDescriptor, ServiceIdentifier, ServiceModuleType, SourceType, UnionToIntersection } from './types';

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
   * Registers one or more service identifiers with the service collection.
   * @param identifiers One or more service identifiers to register
   * @returns A service builder to configure the implementation and lifetime
   * @throws {InvalidServiceIdentifierError} When any identifier is null or undefined
   */
  public abstract register<Types extends [SourceType, ...SourceType[]]>(...identifiers: { [K in keyof Types]: ServiceIdentifier<Types[K]> }): IServiceBuilder<EnsureObject<UnionToIntersection<Types[number]>>>;
  public abstract registerModules(...modules: ServiceModuleType[]): void;
  public abstract overrideLifetime<T extends SourceType>(identifier: ServiceIdentifier<T>, lifetime: Lifetime): void;
  public abstract buildProvider(): IServiceProvider;
  public abstract clone(): IServiceCollection;
  public abstract clone(scoped: true): IServiceCollection;
}

export abstract class ILifetimeBuilder {
  public abstract singleton(): ILifetimeBuilder;
  public abstract scoped(): ILifetimeBuilder;
  public abstract transient(): ILifetimeBuilder;
}

export abstract class IServiceBuilder<T extends SourceType> {
  public abstract to: ServiceBuilderOptions<T>;
}
