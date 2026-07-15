import { beforeEach, describe, expect, it } from 'vitest';
import { dependsOn } from '../src/dependsOn';
import { Lifetime } from '@shellicar/core-di-engine';
import { CircularDependencyError, SelfDependencyError, ServiceCreationError, UnregisteredServiceError } from '@shellicar/core-di-engine';
import { type Boundary, buildEngine, buildEngineAsync, type DisposalSink, type EngineComposition } from '@shellicar/core-di-engine';
import { createDisposal } from '@shellicar/core-di-engine';
import { createResolveLifetime } from '@shellicar/core-di-engine';
import { createScopedLifetime } from '@shellicar/core-di-engine';
import { createSingletonLifetime } from '@shellicar/core-di-engine';
import { type AsyncInstanceFactory, createDescriptorMap, type DescriptorMap, type InstanceFactory, type ServiceDescriptor, type ServiceIdentifier, type ServiceImplementation, type SourceType } from '@shellicar/core-di-engine';
import { holder } from './strategyHolder';

// The engine is proven standalone, against hand-built descriptor maps and the
// lifetime features: the same off-container discipline as graph.ts.

// The strategy comes from the holder: plan by default, naive under the parity
// run (boundaryEngine-naive.spec.ts), which must observe identical behaviour.
const composition = (): EngineComposition => ({
  features: {
    [Lifetime.Singleton]: createSingletonLifetime(),
    [Lifetime.Scoped]: createScopedLifetime(),
    [Lifetime.Resolve]: createResolveLifetime(),
  },
  strategy: holder.factory,
});

type DescriptorOptions<T extends SourceType> = {
  readonly lifetime?: Lifetime;
  readonly factory?: InstanceFactory<T>;
  readonly asyncFactory?: AsyncInstanceFactory<T>;
  readonly eager?: boolean;
  readonly declaredDeps?: readonly ServiceIdentifier<SourceType>[];
};

// An un-verbed registration carries no lifetime on its descriptor; the engine's
// composed defaultLifetime supplies one. Only an explicit `options.lifetime`
// stamps a concrete lifetime here, mirroring a lifetime verb at the call site.
const descriptor = <T extends SourceType>(implementation: ServiceImplementation<T>, options: DescriptorOptions<T> = {}): ServiceDescriptor<T> => ({
  implementation,
  cacheKey: Symbol(implementation.name),
  lifetime: options.lifetime,
  createInstance: options.factory ?? (() => new implementation()),
  createInstanceAsync: options.asyncFactory,
  usesFactory: options.factory != null || options.asyncFactory != null,
  eager: options.eager,
  declaredDeps: options.declaredDeps,
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

// A construction log, so pre-bake timing and pure-lookup can be asserted.
let constructed: string[] = [];
const track = (name: string): void => {
  constructed.push(name);
};
const countOf = (name: string): number => constructed.filter((entry) => entry === name).length;

beforeEach(() => {
  constructed = [];
});

abstract class IDep {}
class Dep implements IDep {
  constructor() {
    track('Dep');
  }
}

abstract class ITwoFields {
  abstract readonly a: IDep;
  abstract readonly b: IDep;
}
class TwoFields implements ITwoFields {
  @dependsOn(IDep) public readonly a!: IDep;
  @dependsOn(IDep) public readonly b!: IDep;
}

abstract class IBottom {}
class Bottom implements IBottom {}
abstract class ITop {
  abstract readonly bottom1: IBottom;
  abstract readonly bottom2: IBottom;
}
class Top implements ITop {
  @dependsOn(IBottom) public readonly bottom1!: IBottom;
  constructor(public readonly bottom2: IBottom) {}
}

abstract class ISelf {}
class Self implements ISelf {
  @dependsOn(ISelf) public readonly self!: ISelf;
}

abstract class ICycleA {}
abstract class ICycleB {}
class CycleA implements ICycleA {
  @dependsOn(ICycleB) public readonly b!: ICycleB;
}
class CycleB implements ICycleB {
  @dependsOn(ICycleA) public readonly a!: ICycleA;
}

abstract class IBoom {}
class Boom implements IBoom {
  constructor() {
    throw new Error('boom');
  }
}
abstract class INeedsBoom {}
class NeedsBoom implements INeedsBoom {
  @dependsOn(IBoom) public readonly boom!: IBoom;
}

abstract class ILevel3 {}
abstract class ILevel2 {}
abstract class ILevel1 {}
class Level3 implements ILevel3 {
  constructor() {
    throw new Error('level3 failed');
  }
}
class Level2 implements ILevel2 {
  @dependsOn(ILevel3) public readonly level3!: ILevel3;
}
class Level1 implements ILevel1 {
  @dependsOn(ILevel2) public readonly level2!: ILevel2;
}

abstract class IUnregistered {}

// Singleton construction timing: lazy by default,
// `.eager()` the opt-in that pre-bakes at build. A plain singleton constructs on
// its first resolve; an `.eager()` one constructs at build. Identity (one instance
// for the provider) holds regardless of which.
describe('boundaryEngine: singleton construction timing (lazy by default, eager opt-in)', () => {
  it('does not construct a plain singleton at build: it is lazy', () => {
    const expected = 0;
    buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), composition());

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('constructs a plain singleton on its first resolve', () => {
    const expected = 1;
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), composition());

    engine.resolve(IDep);
    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('resolves a warm plain singleton as a pure lookup, constructing nothing more', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), composition());
    engine.resolve(IDep);
    const expected = countOf('Dep');

    engine.resolve(IDep);
    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('constructs an eager singleton at build, before any resolve', () => {
    const expected = 1;
    buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton, eager: true })]), composition());

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('resolves an eager singleton as a pure lookup, constructing nothing more', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton, eager: true })]), composition());
    const expected = countOf('Dep');

    engine.resolve(IDep);
    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('returns the same singleton instance across scopes', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), composition());
    const expected = engine.createScope().resolve(IDep);

    const actual = engine.createScope().resolve(IDep);

    expect(actual).toBe(expected);
  });
});

// prebakeSingletons is the composition-level form of `.eager()`: every singleton
// constructs at build, so a warm resolve is a pure lookup. Only singletons can
// prebake (the singleton table is the sole build-time boundary), so the flag
// changes nothing for other lifetimes.
describe('boundaryEngine: prebakeSingletons constructs every singleton at build', () => {
  const prebaking = (): EngineComposition => ({ ...composition(), prebakeSingletons: true });

  it('constructs a plain singleton at build, without .eager()', () => {
    const expected = 1;
    buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), prebaking());

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('resolves a prebaked singleton as a pure lookup, constructing nothing more', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), prebaking());
    const expected = countOf('Dep');

    engine.resolve(IDep);
    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('does not construct a non-singleton at build', () => {
    const expected = 0;
    buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient })]), prebaking());

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('constructs an un-verbed registration at build when the composed default is singleton', () => {
    const expected = 1;
    buildEngine(mapOf([IDep, descriptor(Dep)]), { ...prebaking(), defaultLifetime: Lifetime.Singleton });

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });
});

// The builder forbids `.eager()` on a non-singleton at the type level (see
// composableBuilder.spec): construct-at-build only makes sense for a singleton, the
// sole build-time boundary that holds an instance. These engine tests are the
// safety net for a hand-built DescriptorMap that carries eager on a non-singleton
// anyway: the engine pre-bakes only singletons, so it constructs nothing at build
// for them.
describe('boundaryEngine: eager on a non-singleton has no build-time construction', () => {
  it('does not construct an eager transient at build: no build-time boundary holds it', () => {
    const expected = 0;
    buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient, eager: true })]), composition());

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('does not construct an eager scoped service at build: no build-time boundary holds it', () => {
    const expected = 0;
    buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Scoped, eager: true })]), composition());

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });
});

describe('boundaryEngine: scoped lifetime', () => {
  it('shares one scoped instance within a scope', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Scoped })]), composition());
    const scope = engine.createScope();
    const expected = scope.resolve(IDep);

    const actual = scope.resolve(IDep);

    expect(actual).toBe(expected);
  });

  it('builds a distinct scoped instance per scope', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Scoped })]), composition());
    const first = engine.createScope().resolve(IDep);

    const actual = engine.createScope().resolve(IDep);

    expect(actual).not.toBe(first);
  });
});

describe('boundaryEngine: transient is the floor', () => {
  it('constructs a fresh transient on every resolve', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient })]), composition());
    const first = engine.resolve(IDep);

    const actual = engine.resolve(IDep);

    expect(actual).not.toBe(first);
  });

  it('constructs a distinct transient at each injection point in one resolve', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient })], [ITwoFields, descriptor(TwoFields)]), composition());
    const parent = engine.resolve(ITwoFields);

    const actual = parent.a;

    expect(actual).not.toBe(parent.b);
  });
});

describe('boundaryEngine: resolve lifetime is one instance per pass', () => {
  it('shares one instance across injection points within a pass', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Resolve })], [ITwoFields, descriptor(TwoFields)]), composition());
    const parent = engine.resolve(ITwoFields);
    const expected = parent.a;

    const actual = parent.b;

    expect(actual).toBe(expected);
  });

  it('builds a fresh instance on the next pass', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Resolve })]), composition());
    const first = engine.resolve(IDep);

    const actual = engine.resolve(IDep);

    expect(actual).not.toBe(first);
  });
});

describe('boundaryEngine: opaque factory joins the current pass', () => {
  const build = () => buildEngine(mapOf([IBottom, descriptor(Bottom, { lifetime: Lifetime.Resolve })], [ITop, descriptor(Top, { lifetime: Lifetime.Resolve, factory: (scope) => new Top(scope.resolve(IBottom)) })]), composition());

  it('wires the declared field of a factory-built instance', () => {
    const engine = build();

    const actual = engine.resolve(ITop).bottom1;

    expect(actual).toBeInstanceOf(Bottom);
  });

  it('shares one Bottom across the factory argument and the declared field', () => {
    const engine = build();
    const top = engine.resolve(ITop);
    const expected = top.bottom2;

    const actual = top.bottom1;

    expect(actual).toBe(expected);
  });
});

describe('boundaryEngine: circular and self dependencies', () => {
  it('throws SelfDependencyError for a service depending on itself', () => {
    const engine = buildEngine(mapOf([ISelf, descriptor(Self)]), composition());

    const actual = () => engine.resolve(ISelf);

    expect(actual).toThrow(SelfDependencyError);
  });

  it('throws CircularDependencyError for a resolve-lifetime cycle', () => {
    const engine = buildEngine(mapOf([ICycleA, descriptor(CycleA)], [ICycleB, descriptor(CycleB)]), composition());

    const actual = () => engine.resolve(ICycleA);

    expect(actual).toThrow(CircularDependencyError);
  });

  it('does not throw at build for an eager singleton cycle (held, lenient)', () => {
    const actual = () => buildEngine(mapOf([ICycleA, descriptor(CycleA, { lifetime: Lifetime.Singleton, eager: true })], [ICycleB, descriptor(CycleB, { lifetime: Lifetime.Singleton, eager: true })]), composition());

    expect(actual).not.toThrow();
  });

  it('throws the held CircularDependencyError when the eager singleton cycle is resolved', () => {
    const engine = buildEngine(mapOf([ICycleA, descriptor(CycleA, { lifetime: Lifetime.Singleton, eager: true })], [ICycleB, descriptor(CycleB, { lifetime: Lifetime.Singleton, eager: true })]), composition());

    const actual = () => engine.resolve(ICycleA);

    expect(actual).toThrow(CircularDependencyError);
  });
});

describe('boundaryEngine: creation-error wrapping', () => {
  const build = () => buildEngine(mapOf([IBoom, descriptor(Boom)], [INeedsBoom, descriptor(NeedsBoom)]), composition());

  it('wraps a failing dependency as a ServiceCreationError', () => {
    const engine = build();

    const actual = () => engine.resolve(INeedsBoom);

    expect(actual).toThrow(ServiceCreationError);
  });

  it('identifies the requested service on the wrapper', () => {
    const engine = build();
    let actual: unknown;
    try {
      engine.resolve(INeedsBoom);
    } catch (err) {
      actual = err instanceof ServiceCreationError ? err.identifier : undefined;
    }

    expect(actual).toBe(INeedsBoom);
  });

  it('nests the dependency failure as the inner error', () => {
    const engine = build();
    let actual: unknown;
    try {
      engine.resolve(INeedsBoom);
    } catch (err) {
      actual = err instanceof ServiceCreationError ? err.innerError : undefined;
    }

    expect(actual).toBeInstanceOf(ServiceCreationError);
  });

  it('does not wrap a direct construction failure in a second creation error', () => {
    const engine = buildEngine(mapOf([IBoom, descriptor(Boom)]), composition());
    let actual: unknown;
    try {
      engine.resolve(IBoom);
    } catch (err) {
      actual = err instanceof ServiceCreationError ? err.innerError : undefined;
    }

    expect(actual).not.toBeInstanceOf(ServiceCreationError);
  });

  it('preserves the innermost identifier through a nested chain', () => {
    const engine = buildEngine(mapOf([ILevel3, descriptor(Level3)], [ILevel2, descriptor(Level2)], [ILevel1, descriptor(Level1)]), composition());
    let actual: unknown;
    try {
      engine.resolve(ILevel1);
    } catch (err) {
      let current = err;
      while (current instanceof ServiceCreationError && current.innerError instanceof ServiceCreationError) {
        current = current.innerError;
      }
      actual = current instanceof ServiceCreationError ? current.identifier : undefined;
    }

    expect(actual).toBe(ILevel3);
  });
});

// Held-error-at-build is a property of a *pre-baked* singleton (an `.eager()` or
// async one), since only those construct at build. A failed eager
// construction is held: lenient by default, thrown at build under validate.
describe('boundaryEngine: held singleton errors and validate', () => {
  it('leaves a lenient build unthrown when an eager singleton fails to construct', () => {
    const actual = () => buildEngine(mapOf([IBoom, descriptor(Boom, { lifetime: Lifetime.Singleton, eager: true })]), composition());

    expect(actual).not.toThrow();
  });

  it('throws the held error when the failed eager singleton is resolved', () => {
    const engine = buildEngine(mapOf([IBoom, descriptor(Boom, { lifetime: Lifetime.Singleton, eager: true })]), composition());

    const actual = () => engine.resolve(IBoom);

    expect(actual).toThrow(ServiceCreationError);
  });

  it('throws the held error at build when validate is set', () => {
    const actual = () => buildEngine(mapOf([IBoom, descriptor(Boom, { lifetime: Lifetime.Singleton, eager: true })]), composition(), { validate: true });

    expect(actual).toThrow(ServiceCreationError);
  });
});

describe('boundaryEngine: unregistered and multiplicity', () => {
  it('throws UnregisteredServiceError for an unregistered token', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep)]), composition());

    const actual = () => engine.resolve(IUnregistered);

    expect(actual).toThrow(UnregisteredServiceError);
  });

  it('resolveAll returns one instance per registered descriptor', () => {
    const expected = 2;
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient })], [IDep, descriptor(Dep, { lifetime: Lifetime.Transient })]), composition());

    const actual = engine.resolveAll(IDep).length;

    expect(actual).toBe(expected);
  });

  it('gives distinct instances for two transient registrations of one token', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient })], [IDep, descriptor(Dep, { lifetime: Lifetime.Transient })]), composition());
    const instances = engine.resolveAll(IDep);

    const actual = instances[0];

    expect(actual).not.toBe(instances[1]);
  });
});

describe('boundaryEngine: composition', () => {
  it('throws from createScope when no scoped lifetime is composed', () => {
    // Typed as EngineComposition so createScope is on the type (the scoped feature
    // could be composed): a composition that omits it has no scope to open, so the
    // call throws at runtime. An inline literal without a scoped key would have no
    // createScope on its type at all (see createScope-behaviour.spec).
    const composition: EngineComposition = { features: { [Lifetime.Singleton]: createSingletonLifetime(), [Lifetime.Resolve]: createResolveLifetime() }, strategy: holder.factory };
    const engine = buildEngine(mapOf([IDep, descriptor(Dep)]), composition);

    const actual = () => engine.createScope();

    expect(actual).toThrow();
  });
});

describe('boundaryEngine: default lifetime is an engine composition parameter', () => {
  // An un-verbed registration (no lifetime on its descriptor) resolves under the
  // engine's composed defaultLifetime, not a register-layer default.
  it('resolves an un-verbed registration under the composed default (resolve): shared within a pass', () => {
    const composed: EngineComposition = { ...composition(), defaultLifetime: Lifetime.Resolve };
    const engine = buildEngine(mapOf([IDep, descriptor(Dep)], [ITwoFields, descriptor(TwoFields)]), composed);
    const parent = engine.resolve(ITwoFields);
    const expected = parent.a;

    const actual = parent.b;

    expect(actual).toBe(expected);
  });

  it('honours a different composed default: transient gives a distinct instance per injection point', () => {
    const composed: EngineComposition = { ...composition(), defaultLifetime: Lifetime.Transient };
    const engine = buildEngine(mapOf([IDep, descriptor(Dep)], [ITwoFields, descriptor(TwoFields)]), composed);
    const parent = engine.resolve(ITwoFields);

    const actual = parent.a;

    expect(actual).not.toBe(parent.b);
  });
});

describe('boundaryEngine: disposal seam (surface)', () => {
  type Announcement = { readonly instance: unknown; readonly boundary: Boundary };
  const recordingSink = (): { readonly sink: DisposalSink; readonly announced: Announcement[]; readonly ended: Boundary[] } => {
    const announced: Announcement[] = [];
    const ended: Boundary[] = [];
    const sink: DisposalSink = {
      announce: (instance, boundary) => {
        announced.push({ instance, boundary });
      },
      end: (boundary) => {
        ended.push(boundary);
      },
    };
    return { sink, announced, ended };
  };

  it('announces a constructed instance to the composed disposal sink', () => {
    const { sink, announced } = recordingSink();
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient })]), { ...composition(), disposal: sink });
    const expected = engine.resolve(IDep);

    const actual = announced[announced.length - 1].instance;

    expect(actual).toBe(expected);
  });

  it('announces a scope-resolved construction against the boundary that scope later ends', () => {
    const { sink, announced, ended } = recordingSink();
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Scoped })]), { ...composition(), disposal: sink });
    const scope = engine.createScope();
    scope.resolve(IDep);
    const boundary = announced[announced.length - 1].boundary;

    scope[Symbol.dispose]();

    expect(ended).toContain(boundary);
  });

  it('ends the root boundary when the engine is disposed', () => {
    const { sink, announced, ended } = recordingSink();
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Transient })]), { ...composition(), disposal: sink });
    engine.resolve(IDep);
    const rootBoundary = announced[announced.length - 1].boundary;

    engine[Symbol.dispose]();

    expect(ended).toContain(rootBoundary);
  });
});

describe('boundaryEngine: disposal feature: nearest-boundary tracker', () => {
  abstract class IResource {
    abstract readonly disposed: boolean;
  }
  class Resource implements IResource {
    #disposed = false;
    get disposed() {
      return this.#disposed;
    }
    [Symbol.dispose]() {
      this.#disposed = true;
    }
  }

  abstract class IAsyncResource {
    abstract readonly disposed: boolean;
  }
  class AsyncResource implements IAsyncResource {
    #disposed = false;
    get disposed() {
      return this.#disposed;
    }
    async [Symbol.asyncDispose]() {
      this.#disposed = true;
    }
  }

  const withDisposal = (lifetime: Lifetime) => buildEngine(mapOf([IResource, descriptor(Resource, { lifetime })]), { ...composition(), disposal: createDisposal() });

  const withAsyncDisposal = () => buildEngine(mapOf([IAsyncResource, descriptor(AsyncResource, { lifetime: Lifetime.Transient })]), { ...composition(), disposal: createDisposal() });

  it('disposes a scope-resolved transient at scope dispose', () => {
    const engine = withDisposal(Lifetime.Transient);
    const scope = engine.createScope();
    const instance = scope.resolve(IResource);

    scope[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('does not dispose a scope-resolved transient when the provider is disposed first', () => {
    const engine = withDisposal(Lifetime.Transient);
    const scope = engine.createScope();
    const instance = scope.resolve(IResource);

    engine[Symbol.dispose]();

    expect(instance.disposed).toBe(false);
  });

  it('does not dispose a root-resolved transient when a scope ends', () => {
    const engine = withDisposal(Lifetime.Transient);
    const scope = engine.createScope();
    const instance = engine.resolve(IResource);

    scope[Symbol.dispose]();

    expect(instance.disposed).toBe(false);
  });

  it('disposes a root-resolved transient at provider dispose', () => {
    const engine = withDisposal(Lifetime.Transient);
    const instance = engine.resolve(IResource);

    engine[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('disposes a scoped instance at scope dispose', () => {
    const engine = withDisposal(Lifetime.Scoped);
    const scope = engine.createScope();
    const instance = scope.resolve(IResource);

    scope[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('does not dispose a singleton at scope dispose even when a scope reached it', () => {
    const engine = withDisposal(Lifetime.Singleton);
    const scope = engine.createScope();
    const instance = scope.resolve(IResource);

    scope[Symbol.dispose]();

    expect(instance.disposed).toBe(false);
  });

  it('disposes a singleton at provider dispose', () => {
    const engine = withDisposal(Lifetime.Singleton);
    const instance = engine.resolve(IResource);

    engine[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('disposes a root-resolved resolve-lifetime instance at provider dispose', () => {
    const engine = withDisposal(Lifetime.Resolve);
    const instance = engine.resolve(IResource);

    engine[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('disposes a scope-resolved resolve-lifetime instance at scope dispose', () => {
    const engine = withDisposal(Lifetime.Resolve);
    const scope = engine.createScope();
    const instance = scope.resolve(IResource);

    scope[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('does not dispose a scope-resolved resolve-lifetime instance when the provider is disposed first', () => {
    const engine = withDisposal(Lifetime.Resolve);
    const scope = engine.createScope();
    const instance = scope.resolve(IResource);

    engine[Symbol.dispose]();

    expect(instance.disposed).toBe(false);
  });

  it('disposes an async disposable through asynchronous disposal', async () => {
    const engine = withAsyncDisposal();
    const instance = engine.resolve(IAsyncResource);

    await engine[Symbol.asyncDispose]();

    expect(instance.disposed).toBe(true);
  });

  it('throws when a boundary holding an async-only disposable is disposed synchronously', () => {
    const engine = withAsyncDisposal();
    engine.resolve(IAsyncResource);

    const actual = () => engine[Symbol.dispose]();

    expect(actual).toThrow();
  });
});

// buildEngineAsync awaits async singleton factories (usingAsync) in topo order, so
// their instances are settled before any synchronous resolve. resolve() stays
// synchronous, always.
describe('boundaryEngine: async at the build boundary: buildEngineAsync', () => {
  abstract class IAsyncResource {}
  class AsyncResource implements IAsyncResource {
    constructor() {
      track('AsyncResource');
    }
  }

  abstract class ISyncDep {}
  class SyncDep implements ISyncDep {
    constructor() {
      track('SyncDep');
    }
  }
  abstract class IAsyncHolder {}
  class AsyncHolder implements IAsyncHolder {}

  const asyncSingleton = () => descriptor(AsyncResource, { lifetime: Lifetime.Singleton, asyncFactory: () => Promise.resolve(new AsyncResource()) });
  const rejectingSingleton = () => descriptor(AsyncResource, { lifetime: Lifetime.Singleton, asyncFactory: () => Promise.reject(new Error('async boom')) });

  it('awaits an async singleton factory so a synchronous resolve returns the settled instance', async () => {
    const engine = await buildEngineAsync(mapOf([IAsyncResource, asyncSingleton()]), composition());

    const actual = engine.resolve(IAsyncResource);

    expect(actual).toBeInstanceOf(AsyncResource);
  });

  it('constructs the async singleton once, at build', async () => {
    const expected = 1;
    await buildEngineAsync(mapOf([IAsyncResource, asyncSingleton()]), composition());

    const actual = countOf('AsyncResource');

    expect(actual).toBe(expected);
  });

  it('resolves the awaited async singleton as a pure lookup, constructing nothing more', async () => {
    const engine = await buildEngineAsync(mapOf([IAsyncResource, asyncSingleton()]), composition());
    const expected = countOf('AsyncResource');

    engine.resolve(IAsyncResource);
    const actual = countOf('AsyncResource');

    expect(actual).toBe(expected);
  });

  it('hands an async singleton factory the already-settled instance of its dependency', async () => {
    let captured: unknown;
    const holder = descriptor(AsyncHolder, {
      lifetime: Lifetime.Singleton,
      asyncFactory: (scope) => {
        captured = scope.resolve(ISyncDep);
        return Promise.resolve(new AsyncHolder());
      },
    });
    const engine = await buildEngineAsync(mapOf([ISyncDep, descriptor(SyncDep, { lifetime: Lifetime.Singleton })], [IAsyncHolder, holder]), composition());
    const expected = engine.resolve(ISyncDep);

    const actual = captured;

    expect(actual).toBe(expected);
  });

  it('does not pre-bake a plain synchronous singleton in an async build: only the async node bakes', async () => {
    const expected = 0;
    await buildEngineAsync(mapOf([ISyncDep, descriptor(SyncDep, { lifetime: Lifetime.Singleton })], [IAsyncResource, asyncSingleton()]), composition());

    const actual = countOf('SyncDep');

    expect(actual).toBe(expected);
  });

  it('pre-bakes an eager synchronous singleton alongside an async one', async () => {
    const expected = 1;
    await buildEngineAsync(mapOf([ISyncDep, descriptor(SyncDep, { lifetime: Lifetime.Singleton, eager: true })], [IAsyncResource, asyncSingleton()]), composition());

    const actual = countOf('SyncDep');

    expect(actual).toBe(expected);
  });

  it('leaves the async build unthrown when a singleton factory rejects (lenient)', async () => {
    let actual = 'built';
    try {
      await buildEngineAsync(mapOf([IAsyncResource, rejectingSingleton()]), composition());
    } catch {
      actual = 'threw';
    }

    expect(actual).toBe('built');
  });

  it('throws the held error when the rejected async singleton is resolved', async () => {
    const engine = await buildEngineAsync(mapOf([IAsyncResource, rejectingSingleton()]), composition());

    const actual = () => engine.resolve(IAsyncResource);

    expect(actual).toThrow(ServiceCreationError);
  });

  it('throws the held error at build when validate is set', async () => {
    let actual: unknown;
    try {
      await buildEngineAsync(mapOf([IAsyncResource, rejectingSingleton()]), composition(), { validate: true });
    } catch (err) {
      actual = err;
    }

    expect(actual).toBeInstanceOf(ServiceCreationError);
  });

  // The sync build boundary refuses an async factory outright: a raw
  // DescriptorMap can carry an async-factory node past the type-level guard, so the engine
  // backstops it at build, naming the token and pointing to the async builder.
  it('refuses an async singleton at build under the synchronous buildEngine', () => {
    const actual = () => buildEngine(mapOf([IAsyncResource, asyncSingleton()]), composition());

    expect(actual).toThrow(/buildProviderAsync/);
  });

  it('names the refused async token when the synchronous build throws', () => {
    const actual = () => buildEngine(mapOf([IAsyncResource, asyncSingleton()]), composition());

    expect(actual).toThrow(/IAsyncResource/);
  });
});
