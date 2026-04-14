import type { IServiceBuilder } from '../interfaces';
import type { InstanceFactory, ServiceBuilderOptions, ServiceImplementation, ServiceRegistration, SourceType } from '../types';
import type { ServiceDescriptorLite } from './ServiceDescriptor';

export class ServiceBuilder<T extends SourceType> implements IServiceBuilder<T> {
  public to: ServiceBuilderOptions<T>;

  constructor(addDescriptor: (descriptor: ServiceDescriptorLite<T>) => void) {
    this.to = (implementation: ServiceRegistration<T>, factory?: InstanceFactory<T>): void => {
      addDescriptor({
        implementation,
        factory,
        createInstance: factory ?? (() => new (implementation as ServiceImplementation<T>)()),
      });
    };
  }
}
