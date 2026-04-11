export { createServiceCollection } from './createServiceCollection';
export { DefaultServiceCollectionOptions } from './defaults';
export { dependsOn } from './dependsOn';
export { Lifetime, LogLevel, ResolveMultipleMode } from './enums';
export { CircularDependencyError, InvalidImplementationError, InvalidServiceIdentifierError, MultipleRegistrationError, ScopedSingletonRegistrationError, SelfDependencyError, ServiceCreationError, ServiceError, UnregisteredServiceError } from './errors';
export { IDisposable, ILifetimeBuilder, IResolutionScope, IScopedProvider, IServiceBuilder, IServiceCollection, IServiceModule, IServiceProvider } from './interfaces';
export { ILogger } from './logger';
export type { AbstractNewable, InstanceFactory, MetadataType, Newable, ServiceCollectionOptions, ServiceDescriptor, ServiceIdentifier, ServiceImplementation, ServiceModuleType, ServiceRegistration, SourceType } from './types';
