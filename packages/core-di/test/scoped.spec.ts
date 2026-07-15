import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';
import { ScopedSingletonRegistrationError } from '@shellicar/core-di-engine';

abstract class IAbstract {
  abstract readonly name: string;
}
class Concrete implements IAbstract {
  constructor(public readonly name: string) {}
}

describe('Scoped lifetime', () => {
  const services = createServiceCollection();
  services
    .register(Concrete)
    .using(() => new Concrete(''))
    .as(IAbstract)
    .scoped();
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('resolves the same instance within one scope', () => {
    const expected = scoped.resolve(IAbstract);
    const actual = scoped.resolve(IAbstract);
    expect(actual).toBe(expected);
  });

  it('resolves a different instance across scopes', () => {
    const first = provider.resolve(IAbstract);
    const actual = scoped.resolve(IAbstract);
    expect(actual).not.toBe(first);
  });
});

describe('Registering a singleton in a scope', () => {
  const services = createServiceCollection();
  const provider = services.buildProvider();

  it('throws ScopedSingletonRegistrationError', () => {
    const scope = provider.createScope();
    const builder = scope.Services.register(Concrete)
      .using(() => new Concrete('text1'))
      .as(IAbstract);

    const actual = () => builder.singleton();

    expect(actual).toThrow(ScopedSingletonRegistrationError);
  });
});

describe('Multiple scopes with their own scoped registration', () => {
  const services = createServiceCollection();
  const provider = services.buildProvider();

  it("resolves the first scope's own value", () => {
    const expected = 'text1';
    const scope = provider.createScope();
    scope.Services.register(Concrete)
      .using(() => new Concrete(expected))
      .as(IAbstract)
      .scoped();

    const actual = scope.resolve(IAbstract).name;

    expect(actual).toBe(expected);
  });

  it("resolves the second scope's own value", () => {
    const expected = 'text2';
    const scope = provider.createScope();
    scope.Services.register(Concrete)
      .using(() => new Concrete(expected))
      .as(IAbstract)
      .scoped();

    const actual = scope.resolve(IAbstract).name;

    expect(actual).toBe(expected);
  });
});
