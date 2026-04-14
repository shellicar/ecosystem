import type { ServiceBuilderOptions, ServiceIdentifier, SourceType } from './types';

export abstract class IServiceProvider {
  public abstract resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T;
}

export abstract class IServiceCollection {
  public abstract register<T extends SourceType>(identifier: ServiceIdentifier<T>): IServiceBuilder<T>;
  public abstract buildProvider(): IServiceProvider;
}

export abstract class IServiceBuilder<T extends SourceType> {
  public abstract to: ServiceBuilderOptions<T>;
}
