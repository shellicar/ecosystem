import { Lifetime } from '../enums';
import { InvalidImplementationError, ScopedSingletonRegistrationError } from '../errors';
import type { ILifetimeBuilder, IServiceBuilder } from '../interfaces';
import type { InstanceFactory, ServiceDescriptor, ServiceIdentifier, ServiceImplementation, ServiceRegistration, SourceType } from '../types';

export class ServiceBuilder<T extends SourceType> implements IServiceBuilder<T> {
  private descriptor: ServiceDescriptor<T> | undefined;

  constructor(
    private readonly identifiers: ServiceIdentifier<T>[],
    private readonly isScoped: boolean,
    private readonly addService: (identifier: ServiceIdentifier<T>, descriptor: ServiceDescriptor<T>) => void,
  ) {}

  public to(implementation: ServiceImplementation<T>): ILifetimeBuilder;
  public to(implementation: ServiceIdentifier<T>, factory?: InstanceFactory<T>): ILifetimeBuilder;
  public to(implementation: ServiceRegistration<T>, factory?: InstanceFactory<T> | undefined): ILifetimeBuilder {
    if (implementation == null) {
      throw new InvalidImplementationError<T>(this.identifiers[0]);
    }

    this.descriptor = this.createDescriptor(factory, implementation);

    for (const identifier of this.identifiers) {
      this.addService(identifier, this.descriptor);
    }
    return this;
  }

  private createDescriptor(factory: InstanceFactory<T> | undefined, implementation: ServiceRegistration<T>): ServiceDescriptor<T> {
    return {
      implementation,
      lifetime: Lifetime.Resolve,
      createInstance: factory ?? (() => new (implementation as ServiceImplementation<T>)()),
    };
  }

  public singleton(): this {
    if (this.isScoped) {
      throw new ScopedSingletonRegistrationError();
    }
    this.ensureDescriptor().lifetime = Lifetime.Singleton;
    return this;
  }

  public scoped(): this {
    this.ensureDescriptor().lifetime = Lifetime.Scoped;
    return this;
  }

  public transient(): this {
    this.ensureDescriptor().lifetime = Lifetime.Transient;
    return this;
  }

  private ensureDescriptor(): ServiceDescriptor<T> {
    if (!this.descriptor) {
      throw new Error('Must call to() before setting lifetime');
    }
    return this.descriptor;
  }
}
