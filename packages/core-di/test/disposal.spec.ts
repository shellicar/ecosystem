import { describe, expect, it } from 'vitest';
import { createServiceCollection, type IDisposable } from '../src';

abstract class IDisposableService {
  abstract get disposed(): boolean;
}

class DisposableService implements IDisposableService, IDisposable {
  #disposed = false;
  get disposed() {
    return this.#disposed;
  }
  [Symbol.dispose]() {
    this.#disposed = true;
  }
}

describe('Disposal', () => {
  describe('Singleton lifetime', () => {
    it('does not dispose singleton when scoped provider is disposed', () => {
      const services = createServiceCollection();
      services.register(DisposableService).as(IDisposableService).singleton();
      const provider = services.buildProvider();
      const scoped = provider.createScope();

      const instance = scoped.resolve(IDisposableService);
      scoped[Symbol.dispose]();

      expect(instance.disposed).toBe(false);
    });

    it('disposes singleton when root provider is disposed', () => {
      const services = createServiceCollection();
      services.register(DisposableService).as(IDisposableService).singleton();
      const provider = services.buildProvider();

      const instance = provider.resolve(IDisposableService);
      provider[Symbol.dispose]();

      expect(instance.disposed).toBe(true);
    });
  });

  describe('Scoped lifetime', () => {
    it('disposes scoped instance when scoped provider is disposed', () => {
      const services = createServiceCollection();
      services.register(DisposableService).as(IDisposableService).scoped();
      const provider = services.buildProvider();
      const scoped = provider.createScope();

      const instance = scoped.resolve(IDisposableService);
      scoped[Symbol.dispose]();

      expect(instance.disposed).toBe(true);
    });
  });

  describe('Transient lifetime', () => {
    it('disposes transient instance when provider is disposed', () => {
      const services = createServiceCollection();
      services.register(DisposableService).as(IDisposableService).transient();
      const provider = services.buildProvider();

      const instance = provider.resolve(IDisposableService);
      provider[Symbol.dispose]();

      expect(instance.disposed).toBe(true);
    });

    // v5 nearest-boundary rule: a transient resolved through a scope belongs to
    // that scope, so it dies at scope dispose rather than waiting for the provider.
    it('disposes a scope-resolved transient when the scope is disposed', () => {
      const services = createServiceCollection();
      services.register(DisposableService).as(IDisposableService).transient();
      const provider = services.buildProvider();
      const scoped = provider.createScope();

      const instance = scoped.resolve(IDisposableService);
      scoped[Symbol.dispose]();

      expect(instance.disposed).toBe(true);
    });
  });
});
