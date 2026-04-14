import type { IServiceProvider } from './interfaces';

export type SourceType = object;

export type AbstractNewable<T> = abstract new (...args: any[]) => T;
export type Newable<T> = new (...args: any[]) => T;

export type ServiceIdentifier<T extends SourceType> = { prototype: T; name: string };
export type ServiceImplementation<T extends SourceType> = Newable<T>;
export type ServiceRegistration<T extends SourceType> = ServiceIdentifier<T> | ServiceImplementation<T>;
export type CacheKey<T extends SourceType> = ServiceRegistration<T> | InstanceFactory<T>;

export type InstanceFactory<T extends SourceType> = (x: IServiceProvider) => T;

export type MetadataType<T extends SourceType> = Record<string | symbol, ServiceIdentifier<T>>;

export type ServiceBuilderOptions<T extends SourceType> = {
  (implementation: ServiceImplementation<T>): void;
  (implementation: ServiceIdentifier<T>, factory: InstanceFactory<T>): void;
};
