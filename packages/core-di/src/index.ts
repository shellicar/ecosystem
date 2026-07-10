import './polyfill';

export { createServiceCollection } from './createServiceCollection';
export { DefaultServiceCollectionOptions } from './defaults';
export { dependsOn } from './dependsOn';
export { CaptivePolicy, Lifetime, LogLevel, ResolveMultipleMode, ValidationProblemKind } from './enums';
export { CircularDependencyError, InvalidImplementationError, InvalidServiceIdentifierError, MultipleRegistrationError, ScopedSingletonRegistrationError, SelfDependencyError, ServiceCreationError, ServiceError, UnregisteredServiceError, ValidationError } from './errors';
export { IAbstractServiceBuilder, IDisposable, IForwardBuilder, IForwardResult, INewableServiceBuilder, IResolutionScope, IScopedProvider, IServiceCollection, IServiceModule, IServiceProvider } from './interfaces';
export { ILogger } from './logger';
export type { AbstractNewable, BuildProviderOptions, InstanceFactory, MetadataType, Newable, ServiceCollectionOptions, ServiceDescriptor, ServiceIdentifier, ServiceImplementation, ServiceModuleType, ServiceRegistration, SourceType, ValidationProblem, ValidationReport } from './types';
