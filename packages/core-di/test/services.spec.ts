import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';
import { Lifetime } from '../src/enums';

abstract class IAbstract {}
class Concrete implements IAbstract {}

describe('Service collection', () => {
  it('Cloning services isolates changes', () => {
    const services = createServiceCollection();
    services.register(Concrete).as(IAbstract).transient();

    const cloned = services.clone();
    // mutate the original registration after cloning (a registration has exactly
    // one lifetime, so the lifetime is changed through overrideLifetime, not a
    // second lifetime verb)
    services.overrideLifetime(IAbstract, Lifetime.Singleton);

    const actual = cloned.get(IAbstract)[0].lifetime;

    expect(actual).toBe(Lifetime.Transient);
  });

  it('mutating the original after cloning updates only the original', () => {
    const services = createServiceCollection();
    services.register(Concrete).as(IAbstract).transient();

    services.clone();
    services.overrideLifetime(IAbstract, Lifetime.Singleton);

    const actual = services.get(IAbstract)[0].lifetime;

    expect(actual).toBe(Lifetime.Singleton);
  });
});
