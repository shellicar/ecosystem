import { describe, expect, it } from 'vitest';
import { createServiceCollection, type ILogger } from '../src';

abstract class IAbstract {}
class Concrete implements IAbstract {}
class ErrorOnCreation implements IAbstract {
  constructor() {
    throw new Error('doh');
  }
}

class TestLogger implements ILogger {
  public readonly debugLogs: [unknown, unknown[]][] = [];
  public readonly infoLogs: [unknown, unknown[]][] = [];
  public readonly warnLogs: [unknown, unknown[]][] = [];
  public readonly errorLogs: [unknown, unknown[]][] = [];

  public debug(message?: unknown, ...optionalParams: unknown[]): void {
    this.debugLogs.push([message, optionalParams]);
  }
  public info(message?: unknown, ...optionalParams: unknown[]): void {
    this.infoLogs.push([message, optionalParams]);
  }
  public error(message?: unknown, ...optionalParams: unknown[]): void {
    this.errorLogs.push([message, optionalParams]);
  }
  public warn(message?: unknown, ...optionalParams: unknown[]): void {
    this.warnLogs.push([message, optionalParams]);
  }
}

describe('Debug registration', () => {
  it('Logs on registration', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({ logger });
    services.register(Concrete).as(IAbstract).transient();

    const actual = logger.infoLogs.length;

    expect(actual).toBe(1);
  });

  it('Logs on resolution', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({ logger });
    services.register(Concrete).as(IAbstract).transient();
    const provider = services.buildProvider();
    using scope = provider.createScope();

    scope.resolve(IAbstract);

    const actual = logger.debugLogs.length;

    expect(actual).toBe(1);
  });

  it('Logs error for creation failure', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({ logger });
    services.register(ErrorOnCreation).as(IAbstract);
    const provider = services.buildProvider();

    expect(() => provider.resolve(IAbstract)).toThrow();

    const actual = logger.errorLogs.length;

    expect(actual).toBe(1);
  });

  it('Logs error for factory creation failure', () => {
    const logger = new TestLogger();
    const services = createServiceCollection({ logger });
    services
      .register(ErrorOnCreation)
      .using(() => new ErrorOnCreation())
      .as(IAbstract);
    const provider = services.buildProvider();

    expect(() => provider.resolve(IAbstract)).toThrow();

    const actual = logger.errorLogs.length;

    expect(actual).toBe(1);
  });
});
