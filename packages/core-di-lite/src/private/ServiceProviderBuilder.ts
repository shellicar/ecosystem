import { CircularDependencyError, ServiceCreationError, ServiceError, UnregisteredServiceError } from '../errors';
import { IServiceProvider } from '../interfaces';
import type { CacheKey, ServiceIdentifier, SourceType } from '../types';
import { injectDependencies } from './injectDependencies';
import type { ServiceDescriptorLite } from './ServiceDescriptor';
import { ServiceProvider } from './ServiceProvider';

export class ServiceProviderBuilder extends IServiceProvider {
  private readonly singletons = new Map<CacheKey<any>, any>();
  private readonly resolving = new Set<ServiceIdentifier<any>>();

  constructor(private readonly registrations: Map<ServiceIdentifier<any>, ServiceDescriptorLite<any>>) {
    super();
  }

  buildProvider(): IServiceProvider {
    for (const identifier of this.registrations.keys()) {
      this.resolveInternal(identifier);
    }
    const resolved = new Map<ServiceIdentifier<any>, any>();
    for (const [identifier, descriptor] of this.registrations) {
      const cacheKey = descriptor.factory ?? descriptor.implementation;
      resolved.set(identifier, this.singletons.get(cacheKey));
    }
    return new ServiceProvider(resolved);
  }

  public resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    return this.resolveInternal(identifier);
  }

  resolveInternal = <T extends SourceType>(identifier: ServiceIdentifier<T>): T => {
    const descriptor = this.registrations.get(identifier);
    if (descriptor === undefined) {
      throw new UnregisteredServiceError(identifier);
    }
    const cacheKey = descriptor.factory ?? descriptor.implementation;
    if (this.singletons.has(cacheKey)) {
      return this.singletons.get(cacheKey);
    }
    if (this.resolving.has(identifier)) {
      throw new CircularDependencyError(identifier);
    }
    this.resolving.add(identifier);
    try {
      const instance = descriptor.createInstance(this);
      injectDependencies(instance, this.resolveInternal);
      this.singletons.set(cacheKey, instance);
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
