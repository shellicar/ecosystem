import type { CaptivePolicy, Lifetime, LogLevel, ResolveMultipleMode, RuntimeCaptivePolicy, ValidationProblemKind } from './enums';
import type { IResolutionScope, IServiceModule } from './interfaces';
import type { ILogger } from './logger';
import type { ConsoleLogger } from './private/consoleLogger';

export type SourceType = object;

// biome-ignore lint/suspicious/noExplicitAny: constraint position: `unknown[]` params would reject real constructors (contravariance); the generic still carries T
export type AbstractNewable<T> = abstract new (...args: any[]) => T;
// biome-ignore lint/suspicious/noExplicitAny: constraint position: `unknown[]` params would reject real constructors (contravariance); the generic still carries T
export type Newable<T> = new (...args: any[]) => T;

export type ServiceIdentifier<T extends SourceType> = { prototype: T; name: string };
export type ServiceImplementation<T extends SourceType> = Newable<T>;
export type ServiceRegistration<T extends SourceType> = ServiceIdentifier<T> | ServiceImplementation<T>;

/** A per-register-call identity token: each `register()` call mints a fresh one, shared by its faces. */
export type IdentityToken = symbol;
export type CacheKey<T extends SourceType> = ServiceRegistration<T> | InstanceFactory<T> | IdentityToken;

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

export type ServiceModuleType = Newable<IServiceModule>;

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
   * How a static captive dependency is reported by {@link IServiceCollection.validate}:
   * build-time only, thrown solely under `buildProvider({ validate: true })`.
   * @default CaptivePolicy.Disposal
   */
  captivePolicy: CaptivePolicy;
  /**
   * Whether `resolve()` throws on a runtime captive: a singleton pulling a scoped
   * instance through an opaque factory, invisible to {@link captivePolicy}.
   * @default RuntimeCaptivePolicy.None
   */
  runtimeCaptivePolicy: RuntimeCaptivePolicy;
};

/** A timing from the instrumentation hook: the build once, and each `resolve`. */
export type InstrumentationEvent = { readonly kind: 'build'; readonly durationMs: number } | { readonly kind: 'resolve'; readonly identifier: string; readonly durationMs: number };

/** Receives an {@link InstrumentationEvent} each time one fires. */
export type InstrumentationHook = (event: InstrumentationEvent) => void;

/**
 * The instrumentation hook: times `buildProvider` and each `resolve` when
 * `enabled`. Disabled, the hook is present but never called, so it costs nothing.
 */
export type InstrumentationOptions = {
  readonly enabled: boolean;
  readonly onTiming: InstrumentationHook;
};

/**
 * Options for {@link IServiceCollection.buildProvider}. `validate` throws a
 * {@link ValidationError} up front on bad wiring; `instrument` turns on timing.
 */
export type BuildProviderOptions = {
  validate?: boolean;
  instrument?: InstrumentationOptions;
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

export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type EnsureObject<T> = T extends object ? T : never;

declare const asyncBrand: unique symbol;

/** A registered token to its descriptors, optionally branded async so the sync `buildEngine` rejects an async map. */
export type DescriptorMap<T extends SourceType = SourceType, Async extends boolean = false> = Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]> & {
  readonly [asyncBrand]?: Async;
};

export const createDescriptorMap = <T extends SourceType = SourceType>(): DescriptorMap<T> => {
  return new Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]>();
};
