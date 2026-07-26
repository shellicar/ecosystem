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
    void services.register(RootContext).as(IContext).shadow;
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

    scoped.Services.forward(IAlias).to(OtherTarget).shadow();

    expect(scoped.resolve(IAlias)).toBeInstanceOf(OtherTarget);
    expect(provider.resolve(IAlias)).toBeInstanceOf(Target);
  });
});
