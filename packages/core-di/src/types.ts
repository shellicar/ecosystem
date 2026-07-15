// The core service types moved to @shellicar/core-di-engine and are re-exported
// here; core-di keeps only the collection-level types that reference its own
// surfaces (logger, modules, provider options).
import type { CaptivePolicy, LogLevel, ResolveMultipleMode, RuntimeCaptivePolicy } from './enums';
import type { IServiceModule } from './interfaces';
import type { ILogger } from './logger';
import type { ConsoleLogger } from './private/consoleLogger';
import type { Newable } from '@shellicar/core-di-engine';

export type {
  AbstractNewable,
  AsyncInstanceFactory,
  CacheKey,
  DescriptorMap,
  InstanceFactory,
  MetadataType,
  Newable,
  ResolvedDep,
  ResolvedDeps,
  ServiceDescriptor,
  ServiceIdentifier,
  ServiceImplementation,
  ServiceRegistration,
  SourceType,
  ValidationProblem,
  ValidationReport,
} from '@shellicar/core-di-engine';
export { createDescriptorMap } from '@shellicar/core-di-engine';

export type ServiceModuleType = Newable<IServiceModule>;

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
