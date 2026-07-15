import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';
import { Lifetime } from '../src/enums';
import { BuilderError } from '../src/errors';
import { buildEngine, type EngineComposition } from '../src/private/boundaryEngine';
import { createCollection } from '../src/private/composableBuilder';
import { createResolveLifetime } from '../src/private/lifetimeResolve';
import { createSingletonLifetime } from '../src/private/lifetimeSingleton';

// The main collection always composes the scoped feature, so an empty scope
// (scoped composed, nothing scoped registered) is valid and resolves from root.
// A custom composition without the scoped feature carries no createScope on its
// type, and calling it past the type throws rather than faulting.

abstract class IRootThing {}
class RootThing implements IRootThing {}

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
  });

  it('does not expose createScope when the scoped feature is not composed', () => {
    const services = createCollection([Lifetime.Singleton]);
    // Inline literal so its inferred type has no scoped key.
    const engine = buildEngine(services.regs, { features: { [Lifetime.Singleton]: createSingletonLifetime(), [Lifetime.Resolve]: createResolveLifetime() } });

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
