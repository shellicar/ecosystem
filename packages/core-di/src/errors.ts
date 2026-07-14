import type { ServiceIdentifier, ServiceImplementation, ServiceRegistration, ValidationProblem } from './types';

export abstract class ServiceError extends Error {}

export abstract class BuilderError extends Error {}

export class UnregisteredServiceError<T extends object> extends ServiceError {
  name = 'UnregisteredServiceError';
  constructor(identifier: ServiceIdentifier<T>) {
    super(`Resolving service that has not been registered: ${identifier.name}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MultipleRegistrationError<T extends object> extends ServiceError {
  name = 'MultipleRegistrationError';
  constructor(identifier: ServiceIdentifier<T>) {
    super(`Multiple services have been registered: ${identifier.name}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ServiceCreationError<T extends object> extends ServiceError {
  name = 'ServiceCreationError';
  constructor(
    public readonly identifier: ServiceIdentifier<T>,
    public readonly innerError?: Error,
    public readonly implementation?: ServiceRegistration<T>,
  ) {
    super(ServiceCreationError.getErrorMessage(identifier.name, implementation?.name, innerError));
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static getErrorMessage(identifierName: string, implementationName: string | undefined, innerError: Error | undefined): string {
    const serviceName = implementationName ? `${identifierName} (${implementationName})` : identifierName;
    if (innerError == null) {
      return `Error creating service: ${serviceName}`;
    }
    return `Error creating service: ${serviceName}\n${innerError.message}`;
  }
}

export class SelfDependencyError extends ServiceError {
  name = 'SelfDependencyError';
  constructor() {
    super('Service depending on itself');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CircularDependencyError extends ServiceError {
  name = 'CircularDependencyError';
  constructor(identifier: ServiceIdentifier<object>) {
    super(`Circular dependency detected while resolving: ${identifier.name}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ScopedSingletonRegistrationError extends BuilderError {
  name = 'ScopedSingletonRegistrationError';
  constructor() {
    super('Cannot register a singleton in a scoped service collection');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidServiceIdentifierError extends BuilderError {
  name = 'InvalidServiceIdentifierError';
  constructor() {
    super('Cannot register null or undefined service identifier');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidImplementationError<T extends object> extends BuilderError {
  name = 'InvalidImplementationError';
  constructor(identifier: ServiceIdentifier<T> | undefined) {
    super(`Invalid implementation provided for service: ${identifier?.name ?? 'undefined'}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ServiceError {
  name = 'ValidationError';
  constructor(public readonly problems: ValidationProblem[]) {
    super(ValidationError.getErrorMessage(problems));
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static getErrorMessage(problems: ValidationProblem[]): string {
    const detail = problems.map((problem) => `- ${problem.kind}: ${problem.message}`).join('\n');
    return `Service wiring validation failed with ${problems.length} problem(s):\n${detail}`;
  }
}

/**
 * A build/registration operation the type surface hides because it is invalid,
 * forced past the types (via `as any` or a plain-JS consumer) — `usingAsync` on
 * a sync builder, a verb on a terminal forward, a second lifetime after one is
 * set, a sync build of an async collection, `overrideLifetime` after build,
 * `createScope` with no scoped feature composed, a sync dispose of an async-only
 * boundary. The type is the friendly surface; the runtime enforces correctness,
 * so each of these throws rather than silently corrupting.
 */
export class InvalidOperationError extends BuilderError {
  name = 'InvalidOperationError';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * A singleton that reaches a scoped instance at resolve — through an opaque
 * factory the static graph cannot see — when the `runtimeCaptivePolicy` forbids it
 * (`RuntimeCaptivePolicy.Throw`). The static captive is reported by `validate()`;
 * this is its runtime half, caught at resolution because the factory hid the edge.
 * A resolve-time error, so it is a {@link ServiceError}.
 */
export class CaptiveDependencyError extends ServiceError {
  name = 'CaptiveDependencyError';
  constructor(singleton: ServiceIdentifier<object>, captured: ServiceIdentifier<object>) {
    super(`${singleton.name} (singleton) captured ${captured.name} (scoped) at resolve, through a factory the static graph cannot see — forbidden by RuntimeCaptivePolicy.Throw`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
