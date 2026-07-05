import { describe, expect, it } from 'vitest';
import { createServiceCollection, type IDisposable } from '../src';

abstract class IAbstract {
  abstract get disposed(): boolean;
}
class Concrete implements IAbstract, IDisposable {
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
  services.register(Concrete).as(IAbstract).singleton();
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('resolves the same instance on repeat resolves', () => {
    const expected = scoped.resolve(IAbstract);
    const actual = scoped.resolve(IAbstract);
    expect(actual).toBe(expected);
  });

  it('shares one instance between root and scope', () => {
    const expected = provider.resolve(IAbstract);
    const actual = scoped.resolve(IAbstract);
    expect(actual).toBe(expected);
  });

  it('does not dispose the singleton when a scope is disposed', () => {
    const instance = scoped.resolve(IAbstract);
    scoped[Symbol.dispose]();
    expect(instance.disposed).toBe(false);
  });
});
