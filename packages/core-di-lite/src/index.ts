import '@shellicar/core-di-engine/polyfill';

export { createServiceCollection } from './createServiceCollection';
export { dependsOn } from './dependsOn';
export { BuilderError, CircularDependencyError, InvalidImplementationError, InvalidOperationError, InvalidServiceIdentifierError, MultipleRegistrationError, SelfDependencyError, ServiceCreationError, ServiceError, UnregisteredServiceError } from './errors';
export type { IAbstractServiceBuilder, INewableServiceBuilder, IServiceCollection, IServiceProvider } from './interfaces';
export type { AbstractNewable, InstanceFactory, Newable, ResolvedDeps, ServiceIdentifier, ServiceImplementation, ServiceRegistration, SourceType, ValidationProblem, ValidationReport } from './types';
