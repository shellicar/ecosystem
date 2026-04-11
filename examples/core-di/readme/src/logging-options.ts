import { createServiceCollection, ILogger, LogLevel } from '@shellicar/core-di';

class CustomLogger extends ILogger {
  public override debug(message?: any, ...optionalParams: any[]): void {
    // custom implementation
  }
}
// Override default logger
const services1 = createServiceCollection({ logger: new CustomLogger() });
// Override default log level
const services2 = createServiceCollection({ logLevel: LogLevel.Debug });
