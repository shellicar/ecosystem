import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';
import { Lifetime } from '../src/enums';

abstract class IAbstract {}
class Concrete implements IAbstract {}

describe('Service collection', () => {
  it('Cloning services isolates changes', () => {
    const services = createServiceCollection();
    const builder = services.register(Concrete).as(IAbstract).transient();

    const cloned = services.clone();
    // mutate the original registration after cloning
    builder.singleton();

    const actual = cloned.get(IAbstract)[0].lifetime;

    expect(actual).toBe(Lifetime.Transient);
  });

  it('mutating the builder updates the original collection', () => {
    const services = createServiceCollection();
    const builder = services.register(Concrete).as(IAbstract).transient();

    services.clone();
    builder.singleton();

    const actual = services.get(IAbstract)[0].lifetime;

    expect(actual).toBe(Lifetime.Singleton);
  });
});
