export enum Lifetime {
  Resolve = 'RESOLVE',
  Transient = 'TRANSIENT',
  Scoped = 'SCOPED',
  Singleton = 'SINGLETON',
}

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4,
}

export enum ResolveMultipleMode {
  Error = 'ERROR',
  LastRegistered = 'LAST_REGISTERED',
}

/**
 * How {@link IServiceCollection.validate} reports a static captive dependency (a
 * singleton reaching a shorter-lived service). Build-time only; the runtime
 * captive is a separate axis, {@link RuntimeCaptivePolicy}.
 */
export enum CaptivePolicy {
  /**
   * The default. Reports only a scoped dependency, one whose table is torn down
   * at scope end, before the singleton holding it dies (the MS-DI-style rule).
   * A transient or un-verbed dependency is not reported.
   */
  Disposal = 'DISPOSAL',
  /**
   * Reports any shorter-lived dependency in the singleton's tree: scoped,
   * transient, or un-verbed (which resolves under the composed default lifetime).
   * The strictest report: a singleton should reach only singletons.
   */
  Strict = 'STRICT',
  /** Reports no captive at all. `validate()` stays silent about singleton lifetime reach. */
  None = 'NONE',
}

/**
 * Whether `resolve()` throws on a runtime captive: a singleton pulling a scoped
 * instance through an opaque factory, which {@link CaptivePolicy} cannot see.
 * Defaults to {@link RuntimeCaptivePolicy.None}.
 */
export enum RuntimeCaptivePolicy {
  /**
   * The default. `resolve()` never throws for a runtime captive; the singleton
   * keeps whatever instance the factory returned. Nothing is enforced at resolve.
   */
  None = 'NONE',
  /**
   * `resolve()` throws {@link CaptiveDependencyError} the moment a singleton
   * constructs an instance that pulls a scoped service through a factory.
   */
  Throw = 'THROW',
}

export enum ValidationProblemKind {
  NoIdentity = 'NO_IDENTITY',
  MissingTarget = 'MISSING_TARGET',
  CaptiveDependency = 'CAPTIVE_DEPENDENCY',
  Cycle = 'CYCLE',
  AsyncThroughSyncPath = 'ASYNC_THROUGH_SYNC_PATH',
}
