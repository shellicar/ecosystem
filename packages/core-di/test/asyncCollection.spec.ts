import { describe, expect, it } from 'vitest';
import { Lifetime } from '../src/enums';
import { buildEngine, buildEngineAsync, createPlanStrategy, type EngineComposition } from '../src/private/boundaryEngine';
import { createCollection } from '../src/private/composableBuilder';
import { createResolveLifetime } from '../src/private/lifetimeResolve';
import { createScopedLifetime } from '../src/private/lifetimeScoped';
import { createSingletonLifetime } from '../src/private/lifetimeSingleton';

const composition = (): EngineComposition => ({
  features: {
    [Lifetime.Singleton]: createSingletonLifetime(),
    [Lifetime.Scoped]: createScopedLifetime(),
    [Lifetime.Resolve]: createResolveLifetime(),
  },
  strategy: createPlanStrategy(),
});

abstract class IResource {}
class Resource implements IResource {}

// The async build guard is declared at collection creation, not inferred: the
// async brand carried on the collection's regs decides which
// build path may consume the map. buildEngine accepts only a sync-branded map; an
// async collection is consumed only by buildEngineAsync.
describe('async collection build guard', () => {
  it('lets the synchronous buildEngine consume a sync collection', () => {
    const services = createCollection([Lifetime.Singleton]);
    services.register(Resource).asSelf().singleton();

    const engine = buildEngine(services.regs, composition());
    const actual = engine.resolve(Resource);

    expect(actual).toBeInstanceOf(Resource);
  });

  it('rejects an async collection at the synchronous buildEngine at compile time', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    services
      .register(Resource)
      .usingAsync(async () => new Resource())
      .asSelf()
      .singleton();

    const build = () =>
      // @ts-expect-error - an async collection's map is async-branded; buildEngine consumes only a sync map, so this pushes the consumer to buildEngineAsync
      buildEngine(services.regs, composition());

    expect(build).toThrow(/buildProviderAsync/);
  });

  it('builds an async collection through buildEngineAsync and resolves it synchronously', async () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    services
      .register(Resource)
      .usingAsync(async () => new Resource())
      .asSelf()
      .singleton();

    const engine = await buildEngineAsync(services.regs, composition());
    const actual = engine.resolve(Resource);

    expect(actual).toBeInstanceOf(Resource);
  });
});
