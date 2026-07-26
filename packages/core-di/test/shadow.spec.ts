import { MultipleRegistrationError } from '@shellicar/core-di-engine';
import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IContext {
  public abstract readonly user: string;
}
class RootContext implements IContext {
  public readonly user = 'root';
}
class ScopedContext implements IContext {
  public readonly user = 'scoped';
}

describe('.shadow() overriding an ancestor scope registration', () => {
  it('resolves the shadowing registration, not the root one', () => {
    const services = createServiceCollection();
    services.register(RootContext).as(IContext).singleton();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    scoped.Services.register(ScopedContext).as(IContext).shadow().resolve();

    expect(scoped.resolve(IContext).user).toBe('scoped');
  });

  it('does not affect the root registration', () => {
    const services = createServiceCollection();
    services.register(RootContext).as(IContext).singleton();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    scoped.Services.register(ScopedContext).as(IContext).shadow().resolve();

    expect(provider.resolve(IContext).user).toBe('root');
  });

  it('throws calling .shadow() a second time on the same registration', () => {
    const services = createServiceCollection();
    services.register(RootContext).as(IContext).singleton();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    const actual = () => {
      const builder = scoped.Services.register(ScopedContext).as(IContext).shadow();
      // @ts-expect-error - shadow() is gone from the type after the first call
      builder.shadow();
    };

    expect(actual).toThrow(/shadow\(\) is already set/);
  });

  it('has no .shadow() on a root registration at all', () => {
    const services = createServiceCollection();

    // @ts-expect-error - a root collection's builder never carries .shadow()
    const actual = services.register(RootContext).as(IContext).shadow;

    expect(actual).toBeUndefined();
  });

  it('throws MultipleRegistrationError when a scope shadows the same token twice', () => {
    const services = createServiceCollection();
    services.register(RootContext).as(IContext).singleton();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    scoped.Services.register(ScopedContext).as(IContext).shadow().resolve();
    scoped.Services.register(ScopedContext).as(IContext).shadow().resolve();

    const actual = () => scoped.resolve(IContext);

    expect(actual).toThrow(MultipleRegistrationError);
  });

  it('shadows a forward registration', () => {
    abstract class IAlias {}
    class Target implements IAlias {}
    class OtherTarget implements IAlias {}

    const services = createServiceCollection();
    services.register(Target).asSelf().singleton();
    services.register(OtherTarget).asSelf().singleton();
    services.forward(IAlias).to(Target);
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    scoped.Services.forward(IAlias).shadow().to(OtherTarget);

    expect(scoped.resolve(IAlias)).toBeInstanceOf(OtherTarget);
    expect(provider.resolve(IAlias)).toBeInstanceOf(Target);
  });
});

class NestedContext implements IContext {
  public readonly user = 'nested';
}

describe('.shadow() scope boundaries', () => {
  it('throws MultipleRegistrationError when a scope shadows a token it registered plainly itself, with no ancestor registration', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    scoped.Services.register(RootContext).as(IContext).resolve();
    scoped.Services.register(ScopedContext).as(IContext).shadow().resolve();

    const actual = () => scoped.resolve(IContext);

    expect(actual).toThrow(MultipleRegistrationError);
  });

  it('lets a nested scope shadow what its parent scope already shadowed', () => {
    const services = createServiceCollection();
    services.register(RootContext).as(IContext).singleton();
    const provider = services.buildProvider();
    const scoped = provider.createScope();
    scoped.Services.register(ScopedContext).as(IContext).shadow().resolve();
    const nested = scoped.createScope();

    nested.Services.register(NestedContext).as(IContext).shadow().resolve();

    const expected = 'nested';
    const actual = nested.resolve(IContext).user;

    expect(actual).toBe(expected);
  });
});

// Decided contract, not accident: shadow changes which registration resolve() picks;
// resolveAll() is a different door that was never routed through winnerOf/guardToken,
// so it keeps returning every registration for the token, shadowed or not.
describe('.shadow() and resolveAll()', () => {
  it('resolveAll still returns every registration for the token, including the ones shadow overrides', () => {
    const services = createServiceCollection();
    services.register(RootContext).as(IContext).singleton();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    scoped.Services.register(ScopedContext).as(IContext).shadow().resolve();

    const actual = scoped
      .resolveAll(IContext)
      .map((x) => x.user)
      .sort();

    expect(actual).toEqual(['root', 'scoped']);
  });
});

// Decided contract, not accident: shadow has no "already resolved" guard, unlike a
// lifetime verb after commit. A late .shadow() call changes the winner for the
// token's *next* resolve in that scope; nothing pins the outcome of a resolve that
// already happened.
describe('a late .shadow() call', () => {
  it('changes the outcome of the next resolve, after the token was already resolved once', () => {
    const services = createServiceCollection();
    services.register(RootContext).as(IContext).singleton();
    const provider = services.buildProvider();
    const scoped = provider.createScope();
    const builder = scoped.Services.register(ScopedContext).as(IContext).resolve();

    // Two unshadowed registrations for one token still collide, same as always.
    const before = () => scoped.resolve(IContext);
    expect(before).toThrow(MultipleRegistrationError);

    builder.shadow();
    const after = scoped.resolve(IContext).user;

    expect(after).toBe('scoped');
  });
});

describe('root forward surface', () => {
  it('has no .shadow() on a root forward builder at runtime', () => {
    const services = createServiceCollection();

    // @ts-expect-error - a root collection's forward builder never carries .shadow()
    const actual = services.forward(IContext).shadow;

    expect(actual).toBeUndefined();
  });
});
