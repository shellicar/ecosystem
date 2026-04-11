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
      services.register(IDisposableService).to(DisposableService).singleton();
      const provider = services.buildProvider();
      const scoped = provider.createScope();

      const instance = scoped.resolve(IDisposableService);
      scoped[Symbol.dispose]();

      expect(instance.disposed).toBe(false);
    });

    it('disposes singleton when root provider is disposed', () => {
      const services = createServiceCollection();
      services.register(IDisposableService).to(DisposableService).singleton();
      const provider = services.buildProvider();

      const instance = provider.resolve(IDisposableService);
      provider[Symbol.dispose]();

      expect(instance.disposed).toBe(true);
    });
  });

  describe('Scoped lifetime', () => {
    it('disposes scoped instance when scoped provider is disposed', () => {
      const services = createServiceCollection();
      services.register(IDisposableService).to(DisposableService).scoped();
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
      services.register(IDisposableService).to(DisposableService).transient();
      const provider = services.buildProvider();

      const instance = provider.resolve(IDisposableService);
      provider[Symbol.dispose]();

      expect(instance.disposed).toBe(true);
    });
  });
});
