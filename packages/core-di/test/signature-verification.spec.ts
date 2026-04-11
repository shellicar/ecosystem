import { doesNotThrow, strictEqual } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection } from '../src';

// Define two different interfaces
abstract class IRunnable {
  abstract run(): void;
}

abstract class ILogger {
  abstract log(message: string): void;
}

// Concrete class that implements both interfaces
class Runner implements IRunnable, ILogger {
  run(): void {}
  log(message: string): void {}
}

// Class that implements only IRunnable
class OnlyRunnable implements IRunnable {
  run(): void {}
}

// Class that implements only ILogger
class OnlyLogger implements ILogger {
  log(message: string): void {}
}

describe('Multiple interface registration', () => {
  it('allows registering multiple different interfaces to the same implementation', () => {
    const services = createServiceCollection();

    // This should compile and work because the signature supports multiple different interface types
    doesNotThrow(() => {
      services.register(IRunnable, ILogger).to(Runner).singleton();
    });

    const provider = services.buildProvider();
    const runnable = provider.resolve(IRunnable);
    const logger = provider.resolve(ILogger);

    // Verify they are the same instance
    strictEqual(runnable, logger);

    // Verify the type is correct
    strictEqual(runnable instanceof Runner, true);
  });

  it('type checks implementation - should not compile if implementation does not implement all interfaces', () => {
    const services = createServiceCollection();

    // Should error if trying to register multiple interfaces but implementation only satisfies one
    // @ts-expect-error - OnlyRunnable doesn't implement ILogger
    services.register(IRunnable, ILogger).to(OnlyRunnable);

    // @ts-expect-error - OnlyLogger doesn't implement IRunnable
    services.register(IRunnable, ILogger).to(OnlyLogger);
  });

  it('types match when registering a single interface', () => {
    const services = createServiceCollection();

    // These should compile fine - single interface registration
    doesNotThrow(() => {
      services.register(IRunnable).to(OnlyRunnable);
      services.register(ILogger).to(OnlyLogger);
    });
  });
});
