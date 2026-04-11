import { equal, throws } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection, type ILogger } from '../src';

abstract class IAbstract {}
class Concrete implements IAbstract {}
class ErrorOnCreation implements IAbstract {
  constructor() {
    throw new Error('doh');
  }
}

class TestLogger implements ILogger {
  public readonly debugLogs: [string, string[]][] = [];
  public readonly infoLogs: [string, string[]][] = [];
  public readonly warnLogs: [string, string[]][] = [];
  public readonly errorLogs: [string, string[]][] = [];

  public debug(message?: any, ...optionalParams: any[]): void {
    this.debugLogs.push([message, optionalParams]);
  }
  public info(message?: any, ...optionalParams: any[]): void {
    this.infoLogs.push([message, optionalParams]);
  }
  public error(message?: any, ...optionalParams: any[]): void {
    this.errorLogs.push([message, optionalParams]);
  }
  public warn(message?: any, ...optionalParams: any[]): void {
    this.warnLogs.push([message, optionalParams]);
  }
}

describe('Debug registration', () => {
  it('Logs on registration', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({
      logger,
    });
    services.register(IAbstract).to(Concrete).transient();
    equal(1, logger.infoLogs.length);
  });

  it('Logs on resolution', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({
      logger,
    });
    services.register(IAbstract).to(Concrete).transient();

    const provider = services.buildProvider();
    using scope = provider.createScope();

    scope.resolve(IAbstract);

    equal(1, logger.debugLogs.length);
  });

  it('Logs error for creation failure', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({
      logger,
    });
    services.register(IAbstract).to(ErrorOnCreation);
    const provider = services.buildProvider();
    throws(() => provider.resolve(IAbstract));
    equal(1, logger.errorLogs.length);
  });

  it('Logs error for factory creation failure', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({
      logger,
    });
    services.register(IAbstract).to(ErrorOnCreation, () => new ErrorOnCreation());
    const provider = services.buildProvider();
    throws(() => provider.resolve(IAbstract));
    equal(1, logger.errorLogs.length);
  });
});
