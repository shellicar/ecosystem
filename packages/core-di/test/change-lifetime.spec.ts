import { describe, expect, it } from 'vitest';
import { createServiceCollection, Lifetime } from '../src';

abstract class IAbstract {
  public abstract func1(): void;
}

class Concrete implements IAbstract {
  public func1(): void {}
}

// v5 behaviour change (decided): overrideLifetime works on a collection and
// throws once buildProvider() has been called — the provider derives its plans
// at build, so a later rewrite could not reach them. This is the one frozen
// test the mission authorised rewriting: the ruling falsified the old
// override-after-build shape.
describe('can change lifetime of a registration before building', () => {
  it('uses the overridden lifetime', () => {
    const services = createServiceCollection();
    services.register(Concrete).as(IAbstract).singleton();
    services.overrideLifetime(IAbstract, Lifetime.Transient);
    const sp = services.buildProvider();

    const first = sp.resolve(IAbstract);
    const actual = sp.resolve(IAbstract);

    expect(actual).not.toBe(first);
  });

  it('throws when overriding after buildProvider has been called', () => {
    const services = createServiceCollection();
    services.register(Concrete).as(IAbstract).singleton();
    services.buildProvider();

    const actual = () => services.overrideLifetime(IAbstract, Lifetime.Transient);

    expect(actual).toThrow(/pre-build/);
  });

  it('throws when overriding through a built provider\u2019s Services', () => {
    const services = createServiceCollection();
    services.register(Concrete).as(IAbstract).singleton();
    const sp = services.buildProvider();

    const actual = () => sp.Services.overrideLifetime(IAbstract, Lifetime.Transient);

    expect(actual).toThrow(/pre-build/);
  });
});
