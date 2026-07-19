import type { Lifetime, ValidationProblemKind } from './enums';
import type { IResolutionScope } from './interfaces';

export type SourceType = object;

// biome-ignore lint/suspicious/noExplicitAny: constraint position: `unknown[]` params would reject real constructors (contravariance); the generic still carries T
export type AbstractNewable<T> = abstract new (...args: any[]) => T;
// biome-ignore lint/suspicious/noExplicitAny: constraint position: `unknown[]` params would reject real constructors (contravariance); the generic still carries T
export type Newable<T> = new (...args: any[]) => T;

export type ServiceIdentifier<T extends SourceType> = { prototype: T; name: string };
export type ServiceImplementation<T extends SourceType> = Newable<T>;
export type ServiceRegistration<T extends SourceType> = ServiceIdentifier<T> | ServiceImplementation<T>;

/** The symbol arm is the per-register-call identity token: each `register()` call mints a fresh one, shared by its faces. */
export type CacheKey<T extends SourceType> = ServiceRegistration<T> | InstanceFactory<T> | symbol;

export type InstanceFactory<T extends SourceType> = (x: IResolutionScope) => T;

/** An async factory (`usingAsync`) returning `Promise<T>`, awaited at the build boundary; `resolve()` stays synchronous. */
export type AsyncInstanceFactory<T extends SourceType> = (x: IResolutionScope) => Promise<T>;

/** The instance type a service identifier resolves to. */
export type ResolvedDep<I> = I extends ServiceIdentifier<infer T> ? T : never;
/**
 * The resolved instance types of a tuple of declared dependencies, in order.
 * A declared-deps factory's parameters line up with this positionally.
 */
export type ResolvedDeps<D extends readonly unknown[]> = { [K in keyof D]: ResolvedDep<D[K]> };

/**
 * A registration descriptor: implementation, cache key, lifetime, and the
 * factory that builds it. A forward's instance/key/lifetime fields are inert.
 */
export type ServiceDescriptor<T extends SourceType> = {
  readonly implementation: ServiceRegistration<T>;
  readonly cacheKey: CacheKey<T>;
  lifetime?: Lifetime;
  createInstance: InstanceFactory<T>;
  readonly forwardTarget?: ServiceIdentifier<T>;
  usesFactory?: boolean;
  createInstanceAsync?: AsyncInstanceFactory<T>;
  eager?: boolean;
  declaredDeps?: readonly ServiceIdentifier<SourceType>[];
  createFromDeps?: (deps: readonly SourceType[]) => T;
};

export type MetadataType<T extends SourceType> = Record<string | symbol, ServiceIdentifier<T>>;

/** A single wiring problem reported by validation. */
export type ValidationProblem = {
  readonly kind: ValidationProblemKind;
  readonly message: string;
};

/** The diagnostic report returned by validation. */
export type ValidationReport = {
  readonly valid: boolean;
  readonly problems: ValidationProblem[];
};

declare const asyncBrand: unique symbol;

/** A registered token to its descriptors, optionally branded async so the sync `buildEngine` rejects an async map. */
export type DescriptorMap<T extends SourceType = SourceType, Async extends boolean = false> = Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]> & {
  readonly [asyncBrand]?: Async;
};

export const createDescriptorMap = <T extends SourceType = SourceType>(): DescriptorMap<T> => {
  return new Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]>();
};
