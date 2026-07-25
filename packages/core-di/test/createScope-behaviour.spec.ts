import { BuilderError, buildEngine, createCollection, createPlanStrategy, createResolveLifetime, createSingletonLifetime, type EngineComposition, Lifetime, RuntimeCaptivePolicy } from '@shellicar/core-di-engine';
import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

// The main collection always composes the scoped feature, so an empty scope
// (scoped composed, nothing scoped registered) is valid and resolves from root.
// A custom composition without the scoped feature carries no createScope on its
// type, and calling it past the type throws rather than faulting.

abstract class IRootThing {}
class RootThing implements IRootThing {}

// These tests define nested scoping as a contract: a scope opens its own scope,
// which starts from the parent's registrations at that moment, holds its own
// scoped instances, and shares singletons with the whole provider.
describe('nested createScope', () => {
  it('a nested scope holds its own scoped instance, distinct from its parent scope', () => {
    const services = createServiceCollection();
    services.register(RootThing).as(IRootThing).scoped();
    const provider = services.buildProvider();
    const scope = provider.createScope();
    const nested = scope.createScope();
    const parentInstance = scope.resolve(IRootThing);

    const actual = nested.resolve(IRootThing);

    expect(actual).not.toBe(parentInstance);
  });

  it('a nested scope shares one scoped instance within itself', () => {
    const services = createServiceCollection();
    services.register(RootThing).as(IRootThing).scoped();
    const provider = services.buildProvider();
    const nested = provider.createScope().createScope();
    const expected = nested.resolve(IRootThing);

    const actual = nested.resolve(IRootThing);

    expect(actual).toBe(expected);
  });

  it('a nested scope resolves the same singleton as the provider', () => {
    const services = createServiceCollection();
    services.register(RootThing).as(IRootThing).singleton();
    const provider = services.buildProvider();
    const expected = provider.resolve(IRootThing);

    const actual = provider.createScope().createScope().resolve(IRootThing);

    expect(actual).toBe(expected);
  });

  it('a nested scope starts with the registrations its parent scope holds when it opens', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();
    const scope = provider.createScope();
    scope.Services.register(RootThing).as(IRootThing);
    const nested = scope.createScope();

    const actual = nested.resolve(IRootThing);

    expect(actual).toBeInstanceOf(RootThing);
  });

  it("disposing a nested scope leaves the parent scope's scoped instance alive", () => {
    abstract class IDisposableThing {
      abstract get disposed(): boolean;
    }
    class DisposableThing implements IDisposableThing {
      #disposed = false;
      get disposed() {
        return this.#disposed;
      }
      [Symbol.dispose]() {
        this.#disposed = true;
      }
    }
    const services = createServiceCollection();
    services.register(DisposableThing).as(IDisposableThing).scoped();
    const provider = services.buildProvider();
    const scope = provider.createScope();
    const nested = scope.createScope();
    const parentInstance = scope.resolve(IDisposableThing);
    nested.resolve(IDisposableThing);

    nested[Symbol.dispose]();

    expect(parentInstance.disposed).toBe(false);
  });
});

describe('createScope on the main surface (scoped feature composed)', () => {
  it('creates a scope without throwing when nothing scoped is registered', () => {
    const services = createServiceCollection();
    services.register(RootThing).as(IRootThing).singleton();
    const provider = services.buildProvider();

    const actual = () => provider.createScope();

    expect(actual).not.toThrow();
  });

  it('resolves from root through an empty scope', () => {
    const services = createServiceCollection();
    services.register(RootThing).as(IRootThing).singleton();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const expected = provider.resolve(IRootThing);
    const actual = scope.resolve(IRootThing);

    expect(actual).toBe(expected);
  });
});

describe('createScope on a custom collection composed without the scoped feature', () => {
  const compositionWithoutScoped = (): EngineComposition => ({
    features: {
      [Lifetime.Singleton]: createSingletonLifetime(),
      [Lifetime.Resolve]: createResolveLifetime(),
    },
    strategy: createPlanStrategy(),
    runtimeCaptivePolicy: RuntimeCaptivePolicy.None,
  });

  it('does not expose createScope when the scoped feature is not composed', () => {
    const services = createCollection([Lifetime.Singleton]);
    // Inline literal so its inferred type has no scoped key.
    const engine = buildEngine(services.regs, { features: { [Lifetime.Singleton]: createSingletonLifetime(), [Lifetime.Resolve]: createResolveLifetime() }, strategy: createPlanStrategy(), runtimeCaptivePolicy: RuntimeCaptivePolicy.None });

    // @ts-expect-error - a composition without the scoped feature must not carry createScope on the returned type
    engine.createScope;
  });

  it('throws a BuilderError when createScope is called with no scoped feature composed', () => {
    const services = createCollection([Lifetime.Singleton]);
    services.register(RootThing).asSelf().singleton();
    const engine = buildEngine(services.regs, compositionWithoutScoped());

    const actual = () => engine.createScope();

    expect(actual).toThrow(BuilderError);
  });
});
