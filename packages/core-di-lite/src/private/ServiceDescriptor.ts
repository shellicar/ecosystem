import type { IServiceProvider } from '../interfaces';
import type { InstanceFactory, ServiceRegistration, SourceType } from '../types';

export type ServiceDescriptorLite<T extends SourceType> = {
  implementation: ServiceRegistration<T>;
  factory?: InstanceFactory<T>;
  createInstance: (scope: IServiceProvider) => T;
};
