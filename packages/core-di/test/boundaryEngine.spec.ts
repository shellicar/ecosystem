import { beforeEach, describe, expect, it } from 'vitest';
import { dependsOn } from '../src/dependsOn';
import { Lifetime } from '../src/enums';
import { CircularDependencyError, SelfDependencyError, ServiceCreationError, UnregisteredServiceError } from '../src/errors';
import { type Boundary, buildEngine, type DisposalSink, type EngineComposition } from '../src/private/boundaryEngine';
import { createResolveLifetime } from '../src/private/lifetimeResolve';
import { createScopedLifetime } from '../src/private/lifetimeScoped';
import { createSingletonLifetime } from '../src/private/lifetimeSingleton';
import { createDescriptorMap, type DescriptorMap, type InstanceFactory, type ServiceDescriptor, type ServiceIdentifier, type ServiceImplementation, type SourceType } from '../src/types';

// The engine is proven standalone, against hand-built descriptor maps and the
// Phase 12 lifetime features — the same off-container discipline as graph.ts
// (Phase 10) and the features (Phase 12). Wiring it into the public API and
// deleting the old ServiceProvider is Phase 16.

const composition = (): EngineComposition => ({
  singleton: createSingletonLifetime(),
  scoped: createScopedLifetime(),
  resolve: createResolveLifetime(),
});

type DescriptorOptions<T extends SourceType> = {
  readonly lifetime?: Lifetime;
  readonly factory?: InstanceFactory<T>;
};

// An un-verbed registration carries no lifetime on its descriptor; the engine's
// composed defaultLifetime supplies one. Only an explicit `options.lifetime`
// stamps a concrete lifetime here, mirroring a lifetime verb at the call site.
const descriptor = <T extends SourceType>(implementation: ServiceImplementation<T>, options: DescriptorOptions<T> = {}): ServiceDescriptor<T> => ({
  implementation,
  cacheKey: Symbol(implementation.name),
  lifetime: options.lifetime,
  createInstance: options.factory ?? (() => new implementation()),
  usesFactory: options.factory != null,
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

describe('boundaryEngine: singletons pre-baked at build', () => {
  it('constructs a singleton once, at build, before any resolve', () => {
    const expected = 1;
    buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), composition());

    const actual = countOf('Dep');

    expect(actual).toBe(expected);
  });

  it('resolves the pre-baked singleton as a pure lookup, constructing nothing more', () => {
    const engine = buildEngine(mapOf([IDep, descriptor(Dep, { lifetime: Lifetime.Singleton })]), composition());
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
  const build = () =>
    buildEngine(
      mapOf([IBottom, descriptor(Bottom, { lifetime: Lifetime.Resolve })], [ITop, descriptor(Top, { lifetime: Lifetime.Resolve, factory: (scope) => new Top(scope.resolve(IBottom)) })]),
      composition(),
    );

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

  it('does not throw at build for a singleton cycle (held, lenient)', () => {
    const actual = () => buildEngine(mapOf([ICycleA, descriptor(CycleA, { lifetime: Lifetime.Singleton })], [ICycleB, descriptor(CycleB, { lifetime: Lifetime.Singleton })]), composition());

    expect(actual).not.toThrow();
  });

  it('throws the held CircularDependencyError when the singleton cycle is resolved', () => {
    const engine = buildEngine(mapOf([ICycleA, descriptor(CycleA, { lifetime: Lifetime.Singleton })], [ICycleB, descriptor(CycleB, { lifetime: Lifetime.Singleton })]), composition());

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

describe('boundaryEngine: held singleton errors and validate', () => {
  it('leaves a lenient build unthrown when a singleton fails to construct', () => {
    const actual = () => buildEngine(mapOf([IBoom, descriptor(Boom, { lifetime: Lifetime.Singleton })]), composition());

    expect(actual).not.toThrow();
  });

  it('throws the held error when the failed singleton is resolved', () => {
    const engine = buildEngine(mapOf([IBoom, descriptor(Boom, { lifetime: Lifetime.Singleton })]), composition());

    const actual = () => engine.resolve(IBoom);

    expect(actual).toThrow(ServiceCreationError);
  });

  it('throws the held error at build when validate is set', () => {
    const actual = () => buildEngine(mapOf([IBoom, descriptor(Boom, { lifetime: Lifetime.Singleton })]), composition(), { validate: true });

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
    const engine = buildEngine(mapOf([IDep, descriptor(Dep)]), { singleton: createSingletonLifetime(), resolve: createResolveLifetime() });

    const actual = () => engine.createScope();

    expect(actual).toThrow();
  });
});

describe('boundaryEngine: default lifetime is an engine composition parameter', () => {
  // An un-verbed registration (no lifetime on its descriptor) resolves under the
  // engine's composed defaultLifetime — not a register-layer default.
  it('resolves an un-verbed registration under the composed default (resolve) — shared within a pass', () => {
    const composed: EngineComposition = { ...composition(), defaultLifetime: Lifetime.Resolve };
    const engine = buildEngine(mapOf([IDep, descriptor(Dep)], [ITwoFields, descriptor(TwoFields)]), composed);
    const parent = engine.resolve(ITwoFields);
    const expected = parent.a;

    const actual = parent.b;

    expect(actual).toBe(expected);
  });

  it('honours a different composed default — transient gives a distinct instance per injection point', () => {
    const composed: EngineComposition = { ...composition(), defaultLifetime: Lifetime.Transient };
    const engine = buildEngine(mapOf([IDep, descriptor(Dep)], [ITwoFields, descriptor(TwoFields)]), composed);
    const parent = engine.resolve(ITwoFields);

    const actual = parent.a;

    expect(actual).not.toBe(parent.b);
  });
});

describe('boundaryEngine: disposal seam (surface — Phase 14 supplies the tracker)', () => {
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
