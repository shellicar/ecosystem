export abstract class ILogger {
  public debug(_message?: unknown, ..._optionalParams: unknown[]) {}
  public info(_message?: unknown, ..._optionalParams: unknown[]) {}
  public error(_message?: unknown, ..._optionalParams: unknown[]) {}
  public warn(_message?: unknown, ..._optionalParams: unknown[]) {}
}
