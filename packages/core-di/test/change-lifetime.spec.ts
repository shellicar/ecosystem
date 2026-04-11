import { describe, expect, it } from 'vitest';
import { createServiceCollection, Lifetime, LogLevel } from '../src';

abstract class IAbstract {
  public abstract func1(): void;
}

class Concrete implements IAbstract {
  public func1(): void {}
}

describe('can change lifetime of registration', () => {
  const services = createServiceCollection({ logLevel: LogLevel.Debug });
  services.register(IAbstract).to(Concrete).singleton();
  const sp = services.buildProvider();

  it('uses updated lifetime', () => {
    sp.Services.overrideLifetime(IAbstract, Lifetime.Transient);

    const a1 = sp.resolve(IAbstract);
    const a2 = sp.resolve(IAbstract);
    expect(a1).not.toBe(a2);
  });
});
