import type { ServiceIdentifier } from './types';

export abstract class ServiceError extends Error {}

export class UnregisteredServiceError<T extends object> extends ServiceError {
  name = 'UnregisteredServiceError';
  constructor(identifier: ServiceIdentifier<T>) {
    super(`Resolving service that has not been registered: ${identifier.name}`);
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

export class DuplicateRegistrationError<T extends object> extends ServiceError {
  name = 'DuplicateRegistrationError';
  constructor(identifier: ServiceIdentifier<T>) {
    super(`Service already registered: ${identifier.name}`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ServiceCreationError<T extends object> extends ServiceError {
  name = 'ServiceCreationError';
  constructor(
    public readonly identifier: ServiceIdentifier<T>,
    public readonly innerError?: Error,
    public readonly implementation?: { name: string },
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
