import { describe, expect, it } from 'vitest';
import {
  type AsyncInstanceFactory,
  buildEngine,
  buildEngineAsync,
  createDescriptorMap,
  createNaiveStrategy,
  createPlanStrategy,
  createScopedLifetime,
  createSingletonLifetime,
  type DescriptorMap,
  type EngineComposition,
  InvalidOperationError,
  Lifetime,
  type ServiceDescriptor,
  type ServiceIdentifier,
  type ServiceImplementation,
  type SourceType,
  type StrategyFactory,
} from '../src';

// An async factory can only be honoured at the async build boundary: resolve()
// is synchronous and cannot await. Prebake settles async SINGLETONS there; an
// async node on any other lifetime can never be resolved successfully, and that
// is statically knowable from the descriptor. The refusal follows the engine's
// lenient constitution: one errant registration does not explode the build.
// The error is HELD at build, thrown loudly at resolve, and thrown at build
// under validate: true (which lite always passes, keeping its fail-fast). The
// construct() backstop remains the last line for nodes that never pass a
// build, which is exactly what a scope overlay's late registrations are.

const descriptor = <T extends SourceType>(implementation: ServiceImplementation<T>, lifetime: Lifetime, asyncFactory: AsyncInstanceFactory<T>): ServiceDescriptor<T> => ({
  implementation,
  cacheKey: Symbol(implementation.name),
  lifetime,
  createInstance: () => new implementation(),
  createInstanceAsync: asyncFactory,
  usesFactory: true,
});

const mapOf = (...entries: readonly [ServiceIdentifier<SourceType>, ServiceDescriptor<SourceType>][]): DescriptorMap<SourceType, boolean> => {
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

abstract class IResource {}
class Resource implements IResource {}
class SpecialResource extends Resource {
  readonly fromFactory = true;
}

describe.each(strategies)('an async node on a synchronous resolution path (%s strategy)', (_name, strategy) => {
  const composition = (): EngineComposition => ({
    features: {
      [Lifetime.Singleton]: createSingletonLifetime(),
      [Lifetime.Scoped]: createScopedLifetime(),
    },
    strategy,
  });

  it('control: an async singleton settles at the async build boundary and resolves to the factory product', async () => {
    const engine = await buildEngineAsync(mapOf([IResource, descriptor(Resource, Lifetime.Singleton, async () => new SpecialResource())]), composition());

    const actual = engine.resolve(IResource);

    expect(actual).toBeInstanceOf(SpecialResource);
  });

  it('a lenient async build holds the error for an async non-singleton instead of exploding', async () => {
    const build = buildEngineAsync(mapOf([IResource, descriptor(Resource, Lifetime.Transient, async () => new SpecialResource())]), composition());

    await expect(build).resolves.toBeDefined();
  });

  it('resolving the errant async non-singleton throws rather than silently constructing the bare default', async () => {
    const engine = await buildEngineAsync(mapOf([IResource, descriptor(Resource, Lifetime.Transient, async () => new SpecialResource())]), composition());

    const actual = () => engine.resolve(IResource);

    expect(actual).toThrow(InvalidOperationError);
  });

  it('validate: true throws the held error at the async build for those who opted into fail-fast', async () => {
    const build = buildEngineAsync(mapOf([IResource, descriptor(Resource, Lifetime.Transient, async () => new SpecialResource())]), composition(), { validate: true });

    await expect(build).rejects.toThrow(InvalidOperationError);
  });

  it('the sync build is equally lenient: built, and the errant node throws at resolve', () => {
    const engine = buildEngine(mapOf([IResource, descriptor(Resource, Lifetime.Transient, async () => new SpecialResource())]) as DescriptorMap, composition());

    const actual = () => engine.resolve(IResource);

    expect(actual).toThrow(InvalidOperationError);
  });

  it('backstop: an async node smuggled past build through a scope overlay throws at resolve rather than silently constructing the bare default', async () => {
    const engine = await buildEngineAsync(mapOf(), composition());
    const overlayServices = mapOf([IResource, descriptor(Resource, Lifetime.Transient, async () => new SpecialResource())]) as DescriptorMap;
    const scope = engine.createScope(() => ({ services: overlayServices, version: 1 }));

    const actual = () => scope.resolve(IResource);

    expect(actual).toThrow(InvalidOperationError);
  });
});
