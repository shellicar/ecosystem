import type { CaptivePolicy, Lifetime, LogLevel, ResolveMultipleMode, ValidationProblemKind } from './enums';
import type { IResolutionScope, IServiceModule } from './interfaces';
import type { ILogger } from './logger';
import type { ConsoleLogger } from './private/consoleLogger';

export type SourceType = object;

export type AbstractNewable<T> = abstract new (...args: any[]) => T;
export type Newable<T> = new (...args: any[]) => T;

export type ServiceIdentifier<T extends SourceType> = { prototype: T; name: string }; //AbstractNewable<T>;
export type ServiceImplementation<T extends SourceType> = Newable<T>;
export type ServiceRegistration<T extends SourceType> = ServiceIdentifier<T> | ServiceImplementation<T>;

/**
 * A per-register-call identity token. Since v5 identity is declared, not
 * emergent: each `register(Impl)` call mints a fresh token, every face of that
 * call shares it (so they share one cached instance), and separate `register`
 * calls get distinct tokens (so they are separate instances).
 */
export type IdentityToken = symbol;
export type CacheKey<T extends SourceType> = ServiceRegistration<T> | InstanceFactory<T> | IdentityToken;

export type InstanceFactory<T extends SourceType> = (x: IResolutionScope) => T;

/**
 * An async factory: it returns a `Promise<T>` rather than a `T`. Declared with
 * `usingAsync` (decisions.md §8), which localises the async/sync mismatch at the
 * call site — `using(asyncFactory)` and `usingAsync(syncFactory)` are each a
 * local type error. Its instance is awaited at the build boundary
 * (`buildProviderAsync`); `resolve()` stays synchronous.
 */
export type AsyncInstanceFactory<T extends SourceType> = (x: IResolutionScope) => Promise<T>;

/** The instance type a service identifier resolves to. */
export type ResolvedDep<I> = I extends ServiceIdentifier<infer T> ? T : never;
/**
 * The resolved instance types of a tuple of declared dependencies, in order.
 * A declared-deps factory's parameters line up with this positionally.
 */
export type ResolvedDeps<D extends readonly unknown[]> = { [K in keyof D]: ResolvedDep<D[K]> };

export type ServiceModuleType = Newable<IServiceModule>;

/**
 * A registration descriptor. A normal registration carries the implementation,
 * its identity token (the cache key), a lifetime, and the factory that builds it.
 *
 * `lifetime` is optional: an un-verbed registration declares none, and the
 * engine resolves it under its composed `defaultLifetime` (decisions.md §8).
 * A concrete lifetime here is the registration's own explicit choice.
 *
 * When `forwardTarget` is set the descriptor is a pure redirect: resolving it is
 * resolving the target, so the instance/key/lifetime fields are inert — caching
 * and lifetime belong entirely to the target's registration.
 */
export type ServiceDescriptor<T extends SourceType> = {
  readonly implementation: ServiceRegistration<T>;
  readonly cacheKey: CacheKey<T>;
  lifetime?: Lifetime;
  createInstance: InstanceFactory<T>;
  readonly forwardTarget?: ServiceIdentifier<T>;
  /**
   * Whether a user factory (`using()`) supplies the instance, rather than the
   * default zero-arg `new`. A factory-built registration has opted out of
   * declarative `@dependsOn` wiring, so `validate()` never probe-constructs it.
   */
  usesFactory?: boolean;
  /**
   * Whether the factory is async (`usingAsync`) — it returns a `Promise<T>` whose
   * instance is awaited at the build boundary (`buildProviderAsync`), in
   * topological order, so a later synchronous `resolve()` reads the settled
   * instance. Only a singleton can be pre-baked this way; an async factory
   * reachable through a sync path is a `validate()` problem (decisions.md §8).
   */
  isAsync?: boolean;
  /**
   * The dependencies declared by a `using([deps], factory)` registration. The
   * container resolves them and hands them, positionally, to the factory. Being
   * declared, they are the node's out-edges in `validate()`'s dependency graph —
   * read statically, without probe-construction. Absent for the opaque
   * `using(factory)` form (which terminates the chain) and for `@dependsOn` classes.
   */
  declaredDeps?: readonly ServiceIdentifier<SourceType>[];
};

export type MetadataType<T extends SourceType> = Record<string | symbol, ServiceIdentifier<T>>;

export type ServiceCollectionOptions = {
  /**
   * Whether calling `resolve` when there are multiple registrations
   * will result in an error or resolve the last registered service.
   * @default ResolveMultipleMode.Error
   */
  registrationMode: ResolveMultipleMode;
  /**
   * The default log level for the console logger.
   * @defaultValue {@link LogLevel.Warn}
   */
  logLevel: LogLevel;
  /**
   * Custom implementation for logger. Ignores log level.
   * @defaultValue {@link ConsoleLogger}
   */
  logger?: ILogger;
  /**
   * How captive dependencies (a singleton reaching a shorter-lived service) are
   * reported by {@link IServiceCollection.validate}. The only configurable
   * policy — the others always run.
   * @default CaptivePolicy.Disposal
   */
  captivePolicy: CaptivePolicy;
};

/**
 * Options for {@link IServiceCollection.buildProvider}. When `validate` is true,
 * the wiring is validated up front and a {@link ValidationError} is thrown if it
 * has problems. Omitted or false leaves the provider lenient (the default).
 */
export type BuildProviderOptions = {
  validate?: boolean;
};

/** A single wiring problem reported by {@link IServiceCollection.validate}. */
export type ValidationProblem = {
  readonly kind: ValidationProblemKind;
  readonly message: string;
};

/** The diagnostic report returned by {@link IServiceCollection.validate}. */
export type ValidationReport = {
  readonly valid: boolean;
  readonly problems: ValidationProblem[];
};

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type EnsureObject<T> = T extends object ? T : never;

export type RegistrationMap<T extends SourceType = any> = Map<CacheKey<T>, T>;

/**
 * A phantom brand recording whether a descriptor map came from an async
 * collection (decisions.md §8). It exists only in the type system — never at
 * runtime — so the async/sync build choice is enforced at compile time.
 */
declare const asyncBrand: unique symbol;

/**
 * A registered token to its descriptors. The optional `Async` brand marks a map
 * built from an async collection (`createCollection(..., { async: true })`):
 * `buildEngine` accepts only a sync-branded map (`Async` is `false`), so an
 * async-branded map is a type error against it and the consumer is pushed to
 * `buildEngineAsync` (decisions.md §8). A hand-built {@link createDescriptorMap}
 * is sync-branded and so slips past this at the type level — which is why the
 * engine also refuses an `isAsync` node at build, a runtime backstop.
 */
export type DescriptorMap<T extends SourceType = any, Async extends boolean = false> = Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]> & {
  readonly [asyncBrand]?: Async;
};

export const createRegistrationMap = <T extends SourceType = any>(): RegistrationMap<T> => {
  return new Map<CacheKey<T>, T>();
};

export const createDescriptorMap = <T extends SourceType = any>(): DescriptorMap<T> => {
  return new Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]>();
};
