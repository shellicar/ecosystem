import { describe, expect, it } from 'vitest';
import {
  buildEngine,
  CaptiveDependencyError,
  CircularDependencyError,
  createDescriptorMap,
  createNaiveStrategy,
  createPlanStrategy,
  createResolveLifetime,
  createScopedLifetime,
  createSingletonLifetime,
  type DescriptorMap,
  type EngineComposition,
  type InstanceFactory,
  Lifetime,
  RuntimeCaptivePolicy,
  type ServiceDescriptor,
  type ServiceIdentifier,
  type ServiceImplementation,
  type SourceType,
  type StrategyFactory,
} from '../src';

// resolve() and resolveAll() are the engine's two resolution doors. The
// re-entry guard for opaque factories (constructing) and the runtime captive
// check both live on the resolve() door only; resolveAll() hands nodes straight
// to the strategy. These specs pin that the guards hold at BOTH doors: the
// resolve() cases are passing controls, the resolveAll() cases demonstrate the
// hole. Both strategies are exercised — the guards are engine-level, so the
// strategy must not matter.

const descriptor = <T extends SourceType>(implementation: ServiceImplementation<T>, lifetime: Lifetime | undefined, factory?: InstanceFactory<T>): ServiceDescriptor<T> => ({
  implementation,
  cacheKey: Symbol(implementation.name),
  lifetime,
  createInstance: factory ?? (() => new implementation()),
  usesFactory: factory != null,
});

const mapOf = (...entries: readonly [ServiceIdentifier<SourceType>, ServiceDescriptor<SourceType>][]): DescriptorMap => {
  const map = createDescriptorMap();
  for (const [identifier, desc] of entries) {
    const bucket = map.get(identifier) ?? [];
    bucket.push(desc);
    map.set(identifier, bucket);
  }
  return map;
};

const strategies: readonly [string, StrategyFactory][] = [
  ['plan', createPlanStrategy()],
  ['naive', createNaiveStrategy()],
];

describe.each(strategies)('resolveAll guards (%s strategy)', (_name, strategy) => {
  const composition = (): EngineComposition => ({
    features: {
      [Lifetime.Singleton]: createSingletonLifetime(),
      [Lifetime.Scoped]: createScopedLifetime(),
      [Lifetime.Resolve]: createResolveLifetime(),
    },
    strategy,
    runtimeCaptivePolicy: RuntimeCaptivePolicy.Throw,
  });

  abstract class ISelfRef {}
  class SelfRef implements ISelfRef {}

  it('control: an opaque factory circling back through resolve() throws CircularDependencyError', () => {
    const engine = buildEngine(mapOf([ISelfRef, descriptor(SelfRef, Lifetime.Transient, (scope) => ({ inner: scope.resolve(ISelfRef) }) as unknown as SelfRef)]), composition());

    const actual = () => engine.resolve(ISelfRef);

    expect(actual).toThrow(CircularDependencyError);
  });

  it('an opaque factory circling back through resolveAll() throws CircularDependencyError, not a stack overflow', () => {
    const engine = buildEngine(mapOf([ISelfRef, descriptor(SelfRef, Lifetime.Transient, (scope) => ({ inner: scope.resolveAll(ISelfRef) }) as unknown as SelfRef)]), composition());

    const actual = () => engine.resolve(ISelfRef);

    expect(actual).toThrow(CircularDependencyError);
  });

  abstract class IScopedThing {}
  class ScopedThing implements IScopedThing {}
  abstract class IHolder {}
  class Holder implements IHolder {}

  it('control: a singleton factory pulling a scoped token through resolve() throws under RuntimeCaptivePolicy.Throw', () => {
    const engine = buildEngine(mapOf([IScopedThing, descriptor(ScopedThing, Lifetime.Scoped)], [IHolder, descriptor(Holder, Lifetime.Singleton, (scope) => ({ thing: scope.resolve(IScopedThing) }) as unknown as Holder)]), composition());
    const scope = engine.createScope();

    const actual = () => scope.resolve(IHolder);

    expect(actual).toThrow(CaptiveDependencyError);
  });

  it('a singleton factory pulling a scoped token through resolveAll() throws under RuntimeCaptivePolicy.Throw', () => {
    const engine = buildEngine(mapOf([IScopedThing, descriptor(ScopedThing, Lifetime.Scoped)], [IHolder, descriptor(Holder, Lifetime.Singleton, (scope) => ({ things: scope.resolveAll(IScopedThing) }) as unknown as Holder)]), composition());
    const scope = engine.createScope();

    const actual = () => scope.resolve(IHolder);

    expect(actual).toThrow(CaptiveDependencyError);
  });
});
