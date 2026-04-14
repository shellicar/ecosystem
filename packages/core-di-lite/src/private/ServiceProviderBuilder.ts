import { CircularDependencyError, UnregisteredServiceError, ServiceError, ServiceCreationError } from '../errors';
import { IServiceProvider } from '../interfaces';
import type { ServiceIdentifier, SourceType } from '../types';
import { injectDependencies } from './injectDependencies';
import type { ServiceDescriptorLite } from './ServiceDescriptor';
import { ServiceProvider } from './ServiceProvider';

export class ServiceProviderBuilder extends IServiceProvider {
  buildProvider(): IServiceProvider {
    for (const identifier of this.registrations.keys()) {
      this.resolveInternal(identifier);
    }
    return new ServiceProvider(this.singletons);
  }

  private readonly singletons = new Map<ServiceIdentifier<any>, any>();
  private readonly resolving = new Set<ServiceIdentifier<any>>();

  constructor(private readonly registrations: Map<ServiceIdentifier<any>, ServiceDescriptorLite<any>>) {
    super();
  }

  public resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    return this.resolveInternal(identifier);
  }

  resolveInternal = <T extends SourceType>(identifier: ServiceIdentifier<T>): T => {
    if (this.singletons.has(identifier)) {
      return this.singletons.get(identifier);
    }
    if (this.resolving.has(identifier)) {
      throw new CircularDependencyError(identifier);
    }
    const descriptor = this.registrations.get(identifier);
    if (descriptor === undefined) {
      throw new UnregisteredServiceError(identifier);
    }
    this.resolving.add(identifier);
    try {
      const instance = descriptor.createInstance(this);
      injectDependencies(instance, this.resolveInternal);
      this.singletons.set(identifier, instance);
      return instance;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceCreationError(identifier, error instanceof Error ? error : undefined, descriptor.implementation);
    } finally {
      this.resolving.delete(identifier);
    }
  };
}
