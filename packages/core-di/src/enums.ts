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
