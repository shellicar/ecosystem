export { createServiceCollection } from './createServiceCollection';
export { dependsOn } from './dependsOn';
export { CircularDependencyError, DuplicateRegistrationError, ServiceCreationError, ServiceError, UnregisteredServiceError } from './errors';
export { IServiceBuilder, IServiceCollection, IServiceProvider } from './interfaces';
export type { AbstractNewable, InstanceFactory, MetadataType, Newable, ServiceBuilderOptions, ServiceIdentifier, SourceType } from './types';
