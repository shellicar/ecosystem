import type { Lifetime, Severity, ValidationProblemKind } from './enums';
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
  /** Set when the composing collection stamped its default lifetime at commit, rather than a verb being called. */
  stamped?: boolean;
  createInstance: InstanceFactory<T>;
  readonly forwardTarget?: ServiceIdentifier<T>;
  usesFactory?: boolean;
  createInstanceAsync?: AsyncInstanceFactory<T>;
  eager?: boolean;
  /** Set by `.shadow()`: this registration wins over an ancestor scope's registration of the same token, instead of colliding with it as a genuine duplicate. */
  shadow?: boolean;
  /** The nesting depth of the collection that registered this descriptor (root is 0). Lets `.shadow()` tell an inherited ancestor registration apart from a sibling registered in the same collection. */
  shadowDepth?: number;
  declaredDeps?: readonly ServiceIdentifier<SourceType>[];
  createFromDeps?: (deps: readonly SourceType[]) => T;
};

export type MetadataType<T extends SourceType> = Record<string | symbol, ServiceIdentifier<T>>;

/** A single wiring problem reported by validation. The producing policy stamps the severity, so a problem carried away from its report still knows what it is. */
export type ValidationProblem = {
  readonly kind: ValidationProblemKind;
  readonly severity: Severity;
  readonly message: string;
};

/** The diagnostic report returned by validation. Errors and warnings are separate so "can I build?" and "what should I look at?" are each one property read. */
export type ValidationReport = {
  /** Whether the wiring can be trusted to build: true when there are no errors. Warnings never make a report invalid. */
  readonly valid: boolean;
  readonly errors: readonly ValidationProblem[];
  readonly warnings: readonly ValidationProblem[];
};

declare const asyncBrand: unique symbol;

/** A registered token to its descriptors, optionally branded async so the sync `buildEngine` rejects an async map. */
export type DescriptorMap<T extends SourceType = SourceType, Async extends boolean = false> = Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]> & {
  readonly [asyncBrand]?: Async;
};

export const createDescriptorMap = <T extends SourceType = SourceType>(): DescriptorMap<T> => {
  return new Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]>();
};
