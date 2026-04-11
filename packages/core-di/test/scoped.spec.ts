import { equal, notEqual, throws } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection } from '../src';
import { ScopedSingletonRegistrationError } from '../src/errors';

abstract class IAbstract {
  abstract readonly name: string;
}
class Concrete implements IAbstract {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

describe('Scoped lifetime', () => {
  const services = createServiceCollection();
  services
    .register(IAbstract)
    .to(Concrete, () => new Concrete(''))
    .scoped();
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('created service once', () => {
    const svc1 = scoped.resolve(IAbstract);
    const svc2 = scoped.resolve(IAbstract);
    equal(svc1, svc2);
  });

  it('scoped version is different', () => {
    const svc1 = provider.resolve(IAbstract);
    const svc2 = scoped.resolve(IAbstract);
    notEqual(svc1, svc2);
  });
});

describe('Multiple scopes', () => {
  const services = createServiceCollection();
  const provider = services.buildProvider();

  it('unrelated', () => {
    const expected1 = 'text1';
    const scope1 = provider.createScope();

    const builder = scope1.Services.register(IAbstract).to(Concrete, () => {
      return new Concrete(expected1);
    });

    throws(() => builder.singleton(), ScopedSingletonRegistrationError);
  });

  it('unrelated2', () => {
    {
      const expected1 = 'text1';
      const scope1 = provider.createScope();
      scope1.Services.register(IAbstract)
        .to(Concrete, () => {
          return new Concrete(expected1);
        })
        .scoped();

      const resolved1 = scope1.resolve(IAbstract);
      equal(resolved1.name, expected1);
    }

    {
      const expected2 = 'text2';
      const scope2 = provider.createScope();

      scope2.Services.register(IAbstract)
        .to(Concrete, () => {
          return new Concrete(expected2);
        })
        .scoped();

      const resolved2 = scope2.resolve(IAbstract);
      equal(resolved2.name, expected2);
    }
  });
});
