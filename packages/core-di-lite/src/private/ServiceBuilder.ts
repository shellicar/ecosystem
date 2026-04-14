import type { IServiceBuilder } from '../interfaces';
import type { InstanceFactory, Newable, ServiceBuilderOptions, ServiceIdentifier, SourceType } from '../types';
import type { ServiceDescriptorLite } from './ServiceDescriptor';

export class ServiceBuilder<T extends SourceType> implements IServiceBuilder<T> {
  public to: ServiceBuilderOptions<T>;

  constructor(addDescriptor: (descriptor: ServiceDescriptorLite<T>) => void) {
    this.to = (implementation: Newable<T> | ServiceIdentifier<T>, factory?: InstanceFactory<T>): void => {
      addDescriptor({
        implementation,
        createInstance: factory ?? (() => new (implementation as Newable<T>)()),
      });
    };
  }
}
