// Lite composes the shared engine, so its errors are the engine's: one
// definition, instanceof-compatible with core-di.
export { BuilderError, CircularDependencyError, InvalidImplementationError, InvalidOperationError, InvalidServiceIdentifierError, MultipleRegistrationError, SelfDependencyError, ServiceCreationError, ServiceError, UnregisteredServiceError } from '@shellicar/core-di-engine';
