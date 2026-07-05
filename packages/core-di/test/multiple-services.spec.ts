import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IAbstract1 {
  public abstract func1(): void;
}
abstract class IAbstract2 {
  public abstract func2(): void;
}

class Concrete implements IAbstract1, IAbstract2 {
  public func1(): void {}
  public func2(): void {}
}

describe('multiple faces for singleton', () => {
  const services = createServiceCollection();
  services.register(Concrete).as(IAbstract1).as(IAbstract2).singleton();
  const sp = services.buildProvider();

  it('resolves the same instance across faces', () => {
    const expected = sp.resolve(IAbstract1);
    const actual = sp.resolve(IAbstract2);
    expect(actual).toBe(expected);
  });
});

describe('multiple faces for scoped', () => {
  const services = createServiceCollection();
  services.register(Concrete).as(IAbstract1).as(IAbstract2).scoped();
  const sp = services.buildProvider();

  it('resolves the same instance across faces within a scope', () => {
    using scope = sp.createScope();
    const expected = scope.resolve(IAbstract1);
    const actual = scope.resolve(IAbstract2);
    expect(actual).toBe(expected);
  });
});
