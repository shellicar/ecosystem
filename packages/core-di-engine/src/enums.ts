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
   * A transient dependency is not reported.
   */
  Disposal = 'DISPOSAL',
  /**
   * Reports any shorter-lived dependency in the singleton's tree: scoped or
   * transient. The strictest report: a singleton should reach only singletons.
   */
  Strict = 'STRICT',
  /** Reports no captive at all. `validate()` stays silent about singleton lifetime reach. */
  None = 'NONE',
}

/**
 * Whether `resolve()` throws on a runtime captive: a singleton pulling a scoped
 * instance through an opaque factory, which {@link CaptivePolicy} cannot see.
 * The engine holds no default: every composition must choose. core-di defaults
 * to {@link RuntimeCaptivePolicy.Throw}; core-di-lite composes None.
 */
export enum RuntimeCaptivePolicy {
  /**
   * `resolve()` never throws for a runtime captive; the singleton keeps
   * whatever instance the factory returned. Nothing is enforced at resolve.
   */
  None = 'NONE',
  /**
   * `resolve()` throws {@link CaptiveDependencyError} the moment a singleton
   * constructs an instance that pulls a scoped service through a factory.
   */
  Throw = 'THROW',
}

/**
 * How much a validation problem matters. An error means the wiring cannot be
 * trusted to build: `validate()` reports the composition invalid, and a
 * `buildProvider({ validate: true })` refuses. A warning is a hazard worth
 * looking at that never blocks a build.
 */
export enum Severity {
  Error = 'ERROR',
  Warning = 'WARNING',
}

export enum ValidationProblemKind {
  NoIdentity = 'NO_IDENTITY',
  MissingTarget = 'MISSING_TARGET',
  CaptiveDependency = 'CAPTIVE_DEPENDENCY',
  /** A singleton holding something shared more narrowly than itself. One instance serves the whole provider, so a per-scope or per-resolve dependency cannot be the instance its other consumers share, and what the singleton ends up holding would otherwise depend on how it happened to be built. */
  SharingMismatch = 'SHARING_MISMATCH',
  /** A token that only a scope can serve, reached by a consumer that has no scope to be served from. The token is registered nowhere because the engine binds it: it is not missing, it is unsatisfiable for this consumer. */
  ScopeMismatch = 'SCOPE_MISMATCH',
  Cycle = 'CYCLE',
  AsyncThroughSyncPath = 'ASYNC_THROUGH_SYNC_PATH',
}
