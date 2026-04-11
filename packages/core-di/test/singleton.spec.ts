import { equal, ok } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection, type IDisposable } from '../src';

abstract class IAbstract {
  abstract get disposed(): boolean;
}
class Concreate implements IAbstract, IDisposable {
  #disposed = false;
  public get disposed() {
    return this.#disposed;
  }
  [Symbol.dispose]() {
    this.#disposed = true;
  }
}

describe('Singleton lifetime', () => {
  const services = createServiceCollection();
  services.register(IAbstract).to(Concreate).singleton();
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('created service once', () => {
    const svc1 = scoped.resolve(IAbstract);
    const svc2 = scoped.resolve(IAbstract);
    equal(svc1, svc2);
  });

  it('scoped version is same', () => {
    const svc1 = provider.resolve(IAbstract);
    const svc2 = scoped.resolve(IAbstract);
    equal(svc1, svc2);
  });

  it('does not dispose singletons', () => {
    const svc2 = scoped.resolve(IAbstract);
    scoped[Symbol.dispose]();
    ok(!svc2.disposed);
  });
});
