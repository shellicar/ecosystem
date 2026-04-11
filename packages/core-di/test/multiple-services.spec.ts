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

describe('can use multiple interfaces for singleton', () => {
  const services = createServiceCollection();
  services.register(IAbstract1, IAbstract2).to(Concrete).singleton();
  const sp = services.buildProvider();

  it('resolves with first interface', () => {
    sp.resolve(IAbstract1);
  });

  it('resolves with second interface', () => {
    sp.resolve(IAbstract2);
  });

  it('resolves to same instance', () => {
    const i1 = sp.resolve(IAbstract1);
    const i2 = sp.resolve(IAbstract2);

    expect(i1).toBe(i2);
  });
});

describe('can use multiple interfaces for scoped', () => {
  const services = createServiceCollection();
  services.register(IAbstract1, IAbstract2).to(Concrete).scoped();
  const sp = services.buildProvider();

  it('resolves with first interface', () => {
    sp.resolve(IAbstract1);
  });

  it('resolves with second interface', () => {
    sp.resolve(IAbstract2);
  });

  it('resolves to same instance', () => {
    using scope = sp.createScope();
    const i1 = scope.resolve(IAbstract1);
    const i2 = scope.resolve(IAbstract2);

    expect(i1).toBe(i2);
  });
});
