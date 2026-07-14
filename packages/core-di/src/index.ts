import './polyfill';

export { type CreateServiceCollectionOptions, createServiceCollection } from './createServiceCollection';
export { DefaultServiceCollectionOptions } from './defaults';
export { dependsOn } from './dependsOn';
export { CaptivePolicy, Lifetime, LogLevel, ResolveMultipleMode, RuntimeCaptivePolicy, ValidationProblemKind } from './enums';
export {
  BuilderError,
  CaptiveDependencyError,
  CircularDependencyError,
  InvalidImplementationError,
  InvalidOperationError,
  InvalidServiceIdentifierError,
  MultipleRegistrationError,
  ScopedSingletonRegistrationError,
  SelfDependencyError,
  ServiceCreationError,
  ServiceError,
  UnregisteredServiceError,
  ValidationError,
} from './errors';
export type { IAbstractServiceBuilder, IAsyncServiceCollection, INewableServiceBuilder } from './interfaces';
export { IAsyncDisposable, IDisposable, IForwardBuilder, IForwardResult, IResolutionScope, IScopedProvider, IServiceCollection, IServiceModule, IServiceProvider } from './interfaces';
export { ILogger } from './logger';
export type { AbstractNewable, AsyncInstanceFactory, BuildProviderOptions, InstanceFactory, MetadataType, Newable, ServiceCollectionOptions, ServiceDescriptor, ServiceIdentifier, ServiceImplementation, ServiceModuleType, ServiceRegistration, SourceType, ValidationProblem, ValidationReport } from './types';
