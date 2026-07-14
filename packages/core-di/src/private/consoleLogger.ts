import { LogLevel } from '../enums';
import { ILogger } from '../logger';
import type { ServiceCollectionOptions } from '../types';

export class ConsoleLogger extends ILogger {
  constructor(private readonly options: ServiceCollectionOptions) {
    super();
  }

  public override debug(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.options.logLevel <= LogLevel.Debug) {
      console.debug(message, ...optionalParams);
    }
  }

  public override info(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.options.logLevel <= LogLevel.Info) {
      console.info(message, ...optionalParams);
    }
  }

  public override warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.options.logLevel <= LogLevel.Warn) {
      console.warn(message, ...optionalParams);
    }
  }

  public override error(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.options.logLevel <= LogLevel.Error) {
      console.error(message, ...optionalParams);
    }
  }
}
