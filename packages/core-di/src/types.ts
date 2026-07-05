import type { Lifetime, LogLevel, ResolveMultipleMode, ValidationProblemKind } from './enums';
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

export type ServiceModuleType = Newable<IServiceModule>;

/**
 * A registration descriptor. A normal registration carries the implementation,
 * its identity token (the cache key), a lifetime, and the factory that builds it.
 *
 * When `forwardTarget` is set the descriptor is a pure redirect: resolving it is
 * resolving the target, so the instance/key/lifetime fields are inert — caching
 * and lifetime belong entirely to the target's registration.
 */
export type ServiceDescriptor<T extends SourceType> = {
  readonly implementation: ServiceRegistration<T>;
  readonly cacheKey: CacheKey<T>;
  lifetime: Lifetime;
  createInstance: InstanceFactory<T>;
  readonly forwardTarget?: ServiceIdentifier<T>;
  /**
   * Whether a user factory (`using()`) supplies the instance, rather than the
   * default zero-arg `new`. A factory-built registration has opted out of
   * declarative `@dependsOn` wiring, so `validate()` neither probes it nor
   * includes it in the dependency graph.
   */
  usesFactory?: boolean;
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
export type DescriptorMap<T extends SourceType = any> = Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]>;

export const createRegistrationMap = <T extends SourceType = any>(): RegistrationMap<T> => {
  return new Map<CacheKey<T>, T>();
};

export const createDescriptorMap = <T extends SourceType = any>(): DescriptorMap<T> => {
  return new Map<ServiceIdentifier<T>, ServiceDescriptor<T>[]>();
};
