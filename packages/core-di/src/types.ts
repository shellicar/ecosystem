// Only core-di's own types live here: the collection-level options and hooks
// that reference its surfaces (logger, modules, provider options). The core
// service types are the engine's; import them from @shellicar/core-di-engine.
import type { CaptivePolicy, LogLevel, Newable, ResolveMultipleMode, RuntimeCaptivePolicy } from '@shellicar/core-di-engine';
import type { IServiceCollection, IServiceModule } from './interfaces';
import type { ILogger } from './logger';
import type { ConsoleLogger } from './private/consoleLogger';

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
