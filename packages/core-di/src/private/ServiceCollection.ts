import type { Lifetime } from '../enums';
import { InvalidServiceIdentifierError } from '../errors';
import type { IServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import type { ILogger } from '../logger';
import { createDescriptorMap, type DescriptorMap, type EnsureObject, type ServiceCollectionOptions, type ServiceDescriptor, type ServiceIdentifier, type ServiceModuleType, type SourceType, type UnionToIntersection } from '../types';
import { ServiceBuilder } from './ServiceBuilder';
import { ServiceProvider } from './ServiceProvider';

export class ServiceCollection implements IServiceCollection {
  constructor(
    private readonly logger: ILogger,
    public readonly options: ServiceCollectionOptions,
    private readonly isScoped: boolean,
    private readonly services = createDescriptorMap(),
  ) {}

  public registerModules(...modules: ServiceModuleType[]): void {
    for (const x of modules) {
      const module = new x();
      module.registerServices(this);
    }
  }

  get<T extends SourceType>(key: ServiceIdentifier<T>): ServiceDescriptor<T>[] {
    return this.services.get(key) ?? [];
  }

  public overrideLifetime<T extends SourceType>(identifier: ServiceIdentifier<T>, lifetime: Lifetime): void {
    for (const descriptor of this.get(identifier)) {
      descriptor.lifetime = lifetime;
    }
  }

  register<Types extends [SourceType, ...SourceType[]]>(...identifiers: { [K in keyof Types]: ServiceIdentifier<Types[K]> }): IServiceBuilder<EnsureObject<UnionToIntersection<Types[number]>>> {
    if (identifiers.length === 0 || identifiers.some((id) => id == null)) {
      throw new InvalidServiceIdentifierError();
    }

    return new ServiceBuilder(identifiers, this.isScoped, (identifier, descriptor) => this.addService(identifier, descriptor));
  }

  private addService<T extends SourceType>(identifier: ServiceIdentifier<T>, descriptor: ServiceDescriptor<T>) {
    this.logger.info('Adding service', { identifier: identifier.name, descriptor });
    let existing = this.services.get(identifier);
    if (existing == null) {
      existing = [];
      this.services.set(identifier, existing);
    }
    existing.push(descriptor);
  }

  public clone(scoped?: unknown): IServiceCollection {
    const clonedMap: DescriptorMap = createDescriptorMap();
    for (const [key, descriptors] of this.services) {
      const clonedDescriptors = descriptors.map((descriptor) => ({ ...descriptor }));
      clonedMap.set(key, clonedDescriptors);
    }

    return new ServiceCollection(this.logger, this.options, scoped === true, clonedMap);
  }

  public buildProvider(): IServiceProvider {
    return ServiceProvider.createRoot(this.logger, this.clone());
  }
}
