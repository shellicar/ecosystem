import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

// Two different interfaces
abstract class IRunnable {
  abstract run(): void;
}

abstract class ILogger {
  abstract log(message: string): void;
}

// Concrete class that implements both interfaces
class Runner implements IRunnable, ILogger {
  run(): void {}
  log(_message: string): void {}
}

// Class that implements only IRunnable
class OnlyRunnable implements IRunnable {
  run(): void {}
}

// Class that implements only ILogger
class OnlyLogger implements ILogger {
  log(_message: string): void {}
}

describe('Concrete-first face registration', () => {
  it('registers one implementation under several faces it satisfies', () => {
    const services = createServiceCollection();
    services.register(Runner).as(IRunnable).as(ILogger).singleton();
    const provider = services.buildProvider();

    const expected = provider.resolve(IRunnable);
    const actual = provider.resolve(ILogger);

    expect(actual).toBe(expected);
  });

  it('type checks each face against the implementation', () => {
    const services = createServiceCollection();

    services
      .register(OnlyRunnable)
      .as(IRunnable)
      // @ts-expect-error - OnlyRunnable does not implement ILogger
      .as(ILogger);

    services
      .register(OnlyLogger)
      // @ts-expect-error - OnlyLogger does not implement IRunnable
      .as(IRunnable);
  });

  it('type checks a single face registration', () => {
    const services = createServiceCollection();

    services.register(OnlyRunnable).as(IRunnable);
    services.register(OnlyLogger).as(ILogger);
  });
});
