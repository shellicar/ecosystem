import { describe, expect, it } from 'vitest';
import { createServiceCollection, type IDisposable, Lifetime } from '../src';
import { BuilderError, InvalidImplementationError, InvalidServiceIdentifierError, ScopedSingletonRegistrationError } from '../src/errors';

// The error families, each catchable by its family type: ServiceError for
// resolution errors, BuilderError for build/registration misuse, and
// ValidationError for the thrown validate report. Registration misuse and the
// consumer-facing misuse throws are BuilderError, still catchable by their own
// subclass. A singleton reaching a scoped service is not an error family of its
// own — it is governed by captivePolicy (see captivePolicy.spec).

abstract class IService {}
class Service implements IService {}

describe('registration errors are a BuilderError', () => {
  it('InvalidImplementationError is a BuilderError (register(null))', () => {
    const services = createServiceCollection();

    const actual = () => services.register(null as any);

    expect(actual).toThrow(BuilderError);
  });

  it('InvalidImplementationError is catchable by its own type', () => {
    const services = createServiceCollection();

    const actual = () => services.register(null as any);

    expect(actual).toThrow(InvalidImplementationError);
  });

  it('InvalidServiceIdentifierError is a BuilderError (as(null))', () => {
    const services = createServiceCollection();

    const actual = () => services.register(Service).as(null as any);

    expect(actual).toThrow(BuilderError);
  });

  it('InvalidServiceIdentifierError is a BuilderError (forward(null))', () => {
    const services = createServiceCollection();

    const actual = () => services.forward(null as any).to(IService);

    expect(actual).toThrow(BuilderError);
  });

  it('InvalidServiceIdentifierError is a BuilderError (forward().to(null))', () => {
    const services = createServiceCollection();

    const actual = () => services.forward(IService).to(null as any);

    expect(actual).toThrow(BuilderError);
  });

  it('InvalidServiceIdentifierError is catchable by its own type', () => {
    const services = createServiceCollection();

    const actual = () => services.register(Service).as(null as any);

    expect(actual).toThrow(InvalidServiceIdentifierError);
  });

  it('ScopedSingletonRegistrationError is a BuilderError (singleton in a scoped collection)', () => {
    const provider = createServiceCollection().buildProvider();
    const scoped = provider.createScope();

    const actual = () => scoped.Services.register(Service).as(IService).singleton();

    expect(actual).toThrow(BuilderError);
  });

  it('ScopedSingletonRegistrationError is catchable by its own type', () => {
    const provider = createServiceCollection().buildProvider();
    const scoped = provider.createScope();

    const actual = () => scoped.Services.register(Service).as(IService).singleton();

    expect(actual).toThrow(ScopedSingletonRegistrationError);
  });
});

describe('consumer-facing misuse throws are a BuilderError', () => {
  it('overrideLifetime after build throws a BuilderError', () => {
    const services = createServiceCollection();
    services.register(Service).as(IService).singleton();
    services.buildProvider();

    const actual = () => services.overrideLifetime(IService, Lifetime.Transient);

    expect(actual).toThrow(BuilderError);
  });

  it('a sync dispose of a scope holding an async-only disposable throws a BuilderError', async () => {
    abstract class IAsyncOnly {}
    class AsyncOnly implements IAsyncOnly, IDisposable {
      async [Symbol.asyncDispose]() {}
      [Symbol.dispose]() {}
    }
    const services = createServiceCollection();
    services.register(AsyncOnly).as(IAsyncOnly).scoped();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const instance = scope.resolve(IAsyncOnly) as AsyncOnly;
    // Model an async-only disposable: strip the sync disposer so only
    // Symbol.asyncDispose remains.
    delete (instance as any)[Symbol.dispose];

    const actual = () => scope[Symbol.dispose]();

    expect(actual).toThrow(BuilderError);
  });
});
