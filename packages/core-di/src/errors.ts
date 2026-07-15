// Moved to @shellicar/core-di-engine; re-exported so instanceof identity is one
// definition shared by core-di, core-di-lite, and anything composing the engine.
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
} from '@shellicar/core-di-engine';
