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
 * How {@link IServiceCollection.validate} reports a *static* captive dependency —
 * a singleton that, in the static graph, reaches a shorter-lived service (a
 * scoped, transient or un-verbed dependency it will outlive).
 *
 * This is a build-time *diagnostic*, not a runtime error: `validate()` returns
 * the captive as a problem in its report, and that report is only enforced (thrown
 * as a `ValidationError`) when you opt in with `buildProvider({ validate: true })`.
 * It governs what `validate()` *sees and reports*, nothing more.
 *
 * It does **not** govern the runtime captive — a singleton that pulls a scoped
 * instance through an *opaque factory* at resolve, an edge the static graph cannot
 * see. That is a separate axis with its own switch: see {@link RuntimeCaptivePolicy}.
 */
export enum CaptivePolicy {
  /**
   * The default. Reports only a scoped dependency — one whose table is torn down
   * at scope end, before the singleton holding it dies (the MS-DI-style rule).
   * A transient or un-verbed dependency is not reported.
   */
  Disposal = 'DISPOSAL',
  /**
   * Reports any shorter-lived dependency in the singleton's tree — scoped,
   * transient, or un-verbed (which resolves under the composed default lifetime).
   * The strictest report: a singleton should reach only singletons.
   */
  Strict = 'STRICT',
  /** Reports no captive at all. `validate()` stays silent about singleton lifetime reach. */
  None = 'NONE',
}

/**
 * Whether `resolve()` *throws* on a **runtime** captive: a singleton that pulls a
 * scoped instance through an *opaque factory* (`using((scope) => ...)`) at resolve.
 * The factory hides that edge from the static graph, so {@link IServiceCollection.validate}
 * cannot see it and {@link CaptivePolicy} cannot report it — the only place to catch
 * it is at resolution.
 *
 * This is a distinct axis from {@link CaptivePolicy}: that one decides what the
 * build-time report *contains*; this one decides whether the runtime *hard-fails*.
 * They are set independently, and this one defaults to {@link RuntimeCaptivePolicy.None}
 * — the runtime path adds no throw unless you ask for it, since pulling a scoped
 * instance into a singleton through a factory can be deliberate.
 */
export enum RuntimeCaptivePolicy {
  /**
   * The default. `resolve()` never throws for a runtime captive — the singleton
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
