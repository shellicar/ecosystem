import { equal, notEqual } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection } from '../src';
import { Lifetime } from '../src/enums';

abstract class IAbstract {}
class Concrete implements IAbstract {}

describe('Service collection', () => {
  it('Cloning services isolates changes', () => {
    const services = createServiceCollection();
    const builder = services.register(IAbstract).to(Concrete).transient();

    const provider = services.buildProvider();
    using _scope = provider.createScope();

    const cloned = services.clone();
    // modify original lifetime
    builder.singleton();
    const clonedDescriptor = cloned.get(IAbstract)[0];
    equal(clonedDescriptor.lifetime, Lifetime.Transient);
    // sanity check
    const descriptor = services.get(IAbstract)[0];
    notEqual(descriptor.lifetime, Lifetime.Transient);
  });
});
