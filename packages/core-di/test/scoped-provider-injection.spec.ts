import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IScopedProvider, ScopeMismatchError } from '../src';

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
