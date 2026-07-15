// The engine's polyfill, imported as the external subpath rather than the local
// ./polyfill entry: a local module shared between two entries gets hoisted into
// a pure chunk and tree-shaken away, while an external bare import survives in
// this impure barrel and resolves to the engine's own (impure) polyfill file.
import '@shellicar/core-di-engine/polyfill';

// The public barrel: core-di's own surface plus the parts of the shared engine
// it re-exposes (enums, errors, dependsOn, the core service types). These are
// the package's API, re-exported from their one definition in the engine so
// instanceof and token identity hold across core-di and core-di-lite.
export {
  BuilderError,
  CaptiveDependencyError,
  CaptivePolicy,
  CircularDependencyError,
  dependsOn,
  IForwardBuilder,
  IForwardResult,
  InvalidImplementationError,
  InvalidOperationError,
  InvalidServiceIdentifierError,
  IResolutionScope,
  Lifetime,
  LogLevel,
  MultipleRegistrationError,
  ResolveMultipleMode,
  RuntimeCaptivePolicy,
  ScopedSingletonRegistrationError,
  SelfDependencyError,
  ServiceCreationError,
  ServiceError,
  UnregisteredServiceError,
  ValidationError,
  ValidationProblemKind,
} from '@shellicar/core-di-engine';
export type {
  AbstractNewable,
  AsyncInstanceFactory,
  InstanceFactory,
  MetadataType,
  Newable,
  ServiceDescriptor,
  ServiceIdentifier,
  ServiceImplementation,
  ServiceRegistration,
  SourceType,
  ValidationProblem,
  ValidationReport,
} from '@shellicar/core-di-engine';
export { type CreateServiceCollectionOptions, createServiceCollection } from './createServiceCollection';
export { DefaultServiceCollectionOptions } from './defaults';
export type { IAbstractServiceBuilder, IAsyncServiceCollection, INewableServiceBuilder } from './interfaces';
export { IAsyncDisposable, IDisposable, IScopedProvider, IServiceCollection, IServiceModule, IServiceProvider } from './interfaces';
export { ILogger } from './logger';
export type { BuildProviderOptions, InstrumentationEvent, InstrumentationHook, InstrumentationOptions, ServiceCollectionOptions, ServiceModuleType } from './types';
