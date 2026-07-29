import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IResolutionScope, IScopedProvider, IServiceProvider, ScopeMismatchError } from '../src';

class ScopeConsumer {
  @dependsOn(IScopedProvider) public readonly scope!: IScopedProvider;
}

// The correct contract: IScopedProvider names the scope the consumer is resolved
// from. A consumer that outlives that scope, or is resolved where no scope exists,
// has no honest answer for the token.
describe('injecting IScopedProvider into a scoped service', () => {
  it('receives the scope it was resolved from', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().scoped();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const expected = scope;
    const actual = scope.resolve(ScopeConsumer).scope;

    expect(actual).toBe(expected);
  });

  it('receives its own scope in each scope, not the first one resolved', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().scoped();
    const provider = services.buildProvider();
    provider.createScope().resolve(ScopeConsumer);
    const second = provider.createScope();

    const expected = second;
    const actual = second.resolve(ScopeConsumer).scope;

    expect(actual).toBe(expected);
  });
});

describe('injecting IScopedProvider into a transient service', () => {
  it('receives the scope it was resolved from', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().transient();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const expected = scope;
    const actual = scope.resolve(ScopeConsumer).scope;

    expect(actual).toBe(expected);
  });

  it('throws resolving from the root, where there is no scope to receive', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().transient();
    const provider = services.buildProvider();

    const actual = () => provider.resolve(ScopeConsumer);

    expect(actual).toThrow(ScopeMismatchError);
  });
});

describe('injecting IScopedProvider into a resolve-lifetime service', () => {
  it('receives the scope it was resolved from', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().resolve();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const expected = scope;
    const actual = scope.resolve(ScopeConsumer).scope;

    expect(actual).toBe(expected);
  });
});

// resolveAll asks how many there are, so a surface answers with the one instance its
// reach allows and nothing where it allows none. It does not refuse the way resolve
// does: an empty list is what resolveAll says about anything it has nothing for.
describe('resolveAll on a surface token', () => {
  it('gives the root provider for IServiceProvider', () => {
    const provider = createServiceCollection().buildProvider();

    const expected = [provider];
    const actual = provider.resolveAll(IServiceProvider);

    expect(actual).toEqual(expected);
  });

  it('gives the resolving surface for IResolutionScope', () => {
    const provider = createServiceCollection().buildProvider();

    const expected = [provider];
    const actual = provider.resolveAll(IResolutionScope);

    expect(actual).toEqual(expected);
  });

  it('gives nothing for IScopedProvider at the root, where there is no scope to list', () => {
    const provider = createServiceCollection().buildProvider();

    const expected: IScopedProvider[] = [];
    const actual = provider.resolveAll(IScopedProvider);

    expect(actual).toEqual(expected);
  });

  it('gives the scope itself for IScopedProvider inside a scope', () => {
    const scope = createServiceCollection().buildProvider().createScope();

    const expected = [scope];
    const actual = scope.resolveAll(IScopedProvider);

    expect(actual).toEqual(expected);
  });
});

// A singleton is one instance for the whole provider, so whichever scope it captured
// outlives that scope: every later scope keeps seeing the first one. No boundary makes
// this valid, which is why it throws rather than depending on where it was resolved.
describe('injecting IScopedProvider into a singleton', () => {
  it('throws resolving from the root', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().singleton();
    const provider = services.buildProvider();

    const actual = () => provider.resolve(ScopeConsumer);

    expect(actual).toThrow(ScopeMismatchError);
  });

  it('throws resolving from a scope, which it would otherwise capture past that scope', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().singleton();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const actual = () => scope.resolve(ScopeConsumer);

    expect(actual).toThrow(ScopeMismatchError);
  });
});
