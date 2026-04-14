import { UnregisteredServiceError } from '../errors';
import { IServiceProvider } from '../interfaces';
import type { ServiceIdentifier, SourceType } from '../types';

export class ServiceProvider extends IServiceProvider {
  constructor(private readonly singletons: Map<ServiceIdentifier<any>, any>) {
    super();
  }

  public resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    if (!this.singletons.has(identifier)) {
      throw new UnregisteredServiceError(identifier);
    }
    return this.singletons.get(identifier);
  }
}
