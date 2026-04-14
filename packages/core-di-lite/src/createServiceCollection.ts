import type { IServiceCollection } from './interfaces';
import { ServiceCollection } from './private/ServiceCollection';

export function createServiceCollection(): IServiceCollection {
  return new ServiceCollection();
}
