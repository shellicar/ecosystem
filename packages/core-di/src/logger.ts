export abstract class ILogger {
  public debug(_message?: any, ..._optionalParams: any[]) {}
  public info(_message?: any, ..._optionalParams: any[]) {}
  public error(_message?: any, ..._optionalParams: any[]) {}
  public warn(_message?: any, ..._optionalParams: any[]) {}
}
