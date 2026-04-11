import { equal, throws } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection } from '../src';
import { UnregisteredServiceError } from '../src/errors';

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
    scoped.Services.register(IContext).to(Context, () => new Context('Mr Magoo'));

    const context = scoped.resolve(IContext);
    equal(context.user, 'Mr Magoo');
  });

  it('does not affect parent registrations', () => {
    scoped.Services.register(IContext).to(Context, () => new Context('Mr Magoo'));

    throws(() => {
      provider.resolve(IContext);
    }, UnregisteredServiceError);
  });
});
