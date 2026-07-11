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

export enum CaptivePolicy {
  Disposal = 'DISPOSAL',
  Strict = 'STRICT',
  None = 'NONE',
}

export enum ValidationProblemKind {
  NoIdentity = 'NO_IDENTITY',
  MissingTarget = 'MISSING_TARGET',
  CaptiveDependency = 'CAPTIVE_DEPENDENCY',
  Cycle = 'CYCLE',
  AsyncThroughSyncPath = 'ASYNC_THROUGH_SYNC_PATH',
}
