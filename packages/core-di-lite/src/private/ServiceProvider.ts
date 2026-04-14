import { CircularDependencyError, UnregisteredServiceError } from '../errors';
import { IServiceProvider } from '../interfaces';
import type { ServiceIdentifier, SourceType } from '../types';
import { getMetadata } from './metadata';
import type { ServiceDescriptorLite } from './ServiceDescriptor';

export class ServiceProvider extends IServiceProvider {
  private readonly singletons = new Map<ServiceIdentifier<any>, any>();
  private readonly resolving = new Set<ServiceIdentifier<any>>();

  constructor(private readonly registrations: Map<ServiceIdentifier<any>, ServiceDescriptorLite<any>>) {
    super();
  }

  public build(): void {
    for (const identifier of this.registrations.keys()) {
      this.resolveInternal(identifier);
    }
  }

  public resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    return this.resolveInternal(identifier);
  }

  private resolveInternal<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    if (this.singletons.has(identifier)) {
      return this.singletons.get(identifier) as T;
    }

    if (this.resolving.has(identifier)) {
      throw new CircularDependencyError(identifier);
    }

    const descriptor = this.registrations.get(identifier) as ServiceDescriptorLite<T> | undefined;
    if (descriptor === undefined) {
      throw new UnregisteredServiceError(identifier);
    }

    this.resolving.add(identifier);
    try {
      const instance = descriptor.createInstance(this);
      this.injectDependencies(instance);
      this.singletons.set(identifier, instance);
      return instance;
    } finally {
      this.resolving.delete(identifier);
    }
  }

  private injectDependencies<T extends SourceType>(instance: T): void {
    const deps = getMetadata(instance.constructor) ?? {};
    for (const [key, depIdentifier] of Object.entries(deps)) {
      const dep = this.resolveInternal(depIdentifier as ServiceIdentifier<any>);
      (instance as Record<string, unknown>)[key] = dep;
    }
  }
}
