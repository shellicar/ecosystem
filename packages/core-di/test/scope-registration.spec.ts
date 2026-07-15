import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';
import { UnregisteredServiceError } from '@shellicar/core-di-engine';

abstract class IContext {
  public abstract readonly user: string;
}
class Context implements IContext {
  constructor(public readonly user: string) {}
}

describe('Registration inside scope', () => {
  const services = createServiceCollection();
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('can register in scope', () => {
    scoped.Services.register(Context)
      .using(() => new Context('Mr Magoo'))
      .as(IContext);

    const actual = scoped.resolve(IContext).user;

    expect(actual).toBe('Mr Magoo');
  });

  it('does not affect parent registrations', () => {
    scoped.Services.register(Context)
      .using(() => new Context('Mr Magoo'))
      .as(IContext);

    const actual = () => provider.resolve(IContext);

    expect(actual).toThrow(UnregisteredServiceError);
  });
});
