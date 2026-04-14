import { DuplicateRegistrationError } from '../errors';
import type { IServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import type { ServiceIdentifier, SourceType } from '../types';
import { ServiceBuilder } from './ServiceBuilder';
import type { ServiceDescriptorLite } from './ServiceDescriptor';
import { ServiceProvider } from './ServiceProvider';

export class ServiceCollection implements IServiceCollection {
  private readonly registrations = new Map<ServiceIdentifier<any>, ServiceDescriptorLite<any>>();

  public register<T extends SourceType>(identifier: ServiceIdentifier<T>): IServiceBuilder<T> {
    return new ServiceBuilder<T>((descriptor) => {
      if (this.registrations.has(identifier)) {
        throw new DuplicateRegistrationError(identifier);
      }
      this.registrations.set(identifier, descriptor);
    });
  }

  public buildProvider(): IServiceProvider {
    const provider = new ServiceProvider(new Map(this.registrations));
    provider.build();
    return provider;
  }
}
