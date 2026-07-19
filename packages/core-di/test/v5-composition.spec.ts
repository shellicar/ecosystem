/**
 * Cross-feature seams of the assembled v5 surface.
 * Each describe pins one seam where two independently built layers meet on the
 * public API: the async collection flag, the assembled `.eager()` verb, the
 * engine-owned default lifetime, the self-tokens as boundary surfaces, and
 * disposal driven through the public provider/scope.
 */
import { describe, expect, it } from 'vitest';
import { createServiceCollection, type IAsyncDisposable, type IDisposable, IScopedProvider } from '../src';
import { dependsOn } from '../src/dependsOn';

abstract class IResource {
  abstract readonly label: string;
}
class Resource implements IResource {
  constructor(public readonly label: string = 'made') {}
}

describe('the async flag declares the surface at collection creation', () => {
  it('builds an async registration through buildProviderAsync and resolves it synchronously', async () => {
    const services = createServiceCollection({ async: true });
    services
      .register(Resource)
      .usingAsync(async () => new Resource('awaited'))
      .as(IResource)
      .singleton();
    const provider = await services.buildProviderAsync();

    const actual = provider.resolve(IResource).label;

    expect(actual).toBe('awaited');
  });

  it('does not expose usingAsync on a sync collection', () => {
    const services = createServiceCollection();

    // @ts-expect-error - the collection was not created async; the builder has no usingAsync verb at all
    services.register(Resource).usingAsync;
  });

  it('does not expose buildProviderAsync on a sync collection', () => {
    const services = createServiceCollection();

    // @ts-expect-error - the collection was not created async; buildProviderAsync does not exist on its type
    services.buildProviderAsync;
  });

  it('does not expose the synchronous buildProvider on an async collection', () => {
    const services = createServiceCollection({ async: true });

    // @ts-expect-error - an async collection builds only through buildProviderAsync; a sync build could not await its factories
    services.buildProvider;
  });
});

describe('.eager() is assembled onto the public surface', () => {
  it('constructs an eager singleton at build, before any resolve', () => {
    let constructions = 0;
    class Eagerly {
      constructor() {
        constructions++;
      }
    }
    const services = createServiceCollection();
    services.register(Eagerly).asSelf().singleton().eager();

    services.buildProvider();

    expect(constructions).toBe(1);
  });

  it('leaves a plain singleton lazy until first resolve', () => {
    let constructions = 0;
    class Lazily {
      constructor() {
        constructions++;
      }
    }
    const services = createServiceCollection();
    services.register(Lazily).asSelf().singleton();

    services.buildProvider();

    expect(constructions).toBe(0);
  });
});

describe('the engine owns the default lifetime: the register layer stamps nothing', () => {
  it('leaves an un-verbed registration with no lifetime on its descriptor', () => {
    const services = createServiceCollection();
    services.register(Resource).as(IResource);

    const actual = services.get(IResource)[0].lifetime;

    expect(actual).toBeUndefined();
  });

  it('resolves an un-verbed registration under the engine default (resolve: one per pass, fresh next pass)', () => {
    const services = createServiceCollection();
    services.register(Resource).as(IResource);
    const provider = services.buildProvider();

    const first = provider.resolve(IResource);
    const actual = provider.resolve(IResource);

    expect(actual).not.toBe(first);
  });
});

describe('an injected IScopedProvider is the boundary surface, not the in-pass scope', () => {
  abstract class ICounter {}
  class Counter implements ICounter {}

  class UsesScopeLater {
    @dependsOn(IScopedProvider) scope!: IScopedProvider;
  }

  it('yields fresh Resolve-lifetime instances per method-call-time resolve', () => {
    const services = createServiceCollection();
    services.register(Counter).as(ICounter).resolve();
    services.register(UsesScopeLater).asSelf();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    const svc = scoped.resolve(UsesScopeLater);
    // Each call through the injected surface is a fresh pass: an in-pass
    // surface would replay the pass cache and hand back a stale instance.
    const first = svc.scope.resolve(ICounter);
    const actual = svc.scope.resolve(ICounter);

    expect(actual).not.toBe(first);
  });
});

class DisposableService implements IDisposable {
  disposed = false;
  [Symbol.dispose]() {
    this.disposed = true;
  }
}

class AsyncOnlyDisposable implements IAsyncDisposable {
  disposed = false;
  async [Symbol.asyncDispose]() {
    this.disposed = true;
  }
}

describe('disposal through the public surface', () => {
  // A disposable resolved *through a scope* is tracked and dies at that scope's end.
  it('disposes a scope-resolved resolve-lifetime disposable at scope dispose', () => {
    const services = createServiceCollection();
    services.register(DisposableService).asSelf();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    const instance = scoped.resolve(DisposableService);
    scoped[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('does not dispose a scope-resolved disposable at provider dispose', () => {
    const services = createServiceCollection();
    services.register(DisposableService).asSelf();
    const provider = services.buildProvider();
    const scoped = provider.createScope();

    const instance = scoped.resolve(DisposableService);
    provider[Symbol.dispose]();

    expect(instance.disposed).toBe(false);
  });

  it('disposes an async-only disposable at an async provider dispose', async () => {
    const services = createServiceCollection();
    services.register(AsyncOnlyDisposable).asSelf();
    const provider = services.buildProvider();

    const instance = provider.resolve(AsyncOnlyDisposable);
    await provider[Symbol.asyncDispose]();

    expect(instance.disposed).toBe(true);
  });

  it('throws on a sync dispose of a boundary holding an async-only disposable', () => {
    const services = createServiceCollection();
    services.register(AsyncOnlyDisposable).asSelf();
    const provider = services.buildProvider();
    provider.resolve(AsyncOnlyDisposable);

    const actual = () => provider[Symbol.dispose]();

    expect(actual).toThrow(/async/);
  });
});
