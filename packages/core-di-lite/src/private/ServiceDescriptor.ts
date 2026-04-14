import type { IServiceProvider } from '../interfaces';
import type { SourceType } from '../types';

export type ServiceDescriptorLite<T extends SourceType> = {
  implementation: { name: string };
  createInstance: (scope: IServiceProvider) => T;
};
