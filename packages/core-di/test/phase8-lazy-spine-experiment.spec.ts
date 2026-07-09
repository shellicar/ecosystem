/**
 * Phase 8 investigation — EXPERIMENT (evidence, not production code).
 *
 * Crux: can a complete resolution spine (decisions.md §6) be built while
 * singletons stay LAZY, given that `@dependsOn` edges exist only at construction
 * (§4)? Each `describe` below is one experiment; a green run is the finding.
 *
 * Grounding: uses the real `@dependsOn` decorator and the real metadata store
 * (src/private/metadata + constants), so the construction-gating it demonstrates
 * is the library's actual mechanism, not a mock of it.
 */
import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, UnregisteredServiceError } from '../src';
import { DesignDependenciesKey } from '../src/private/constants';
import { getMetadata } from '../src/private/metadata';

// ---------------------------------------------------------------------------
// E1 — @dependsOn edges are CONSTRUCTION-GATED (the crux fact).
// The decorator's body is a per-instance field initializer: it tags the
// class's edges into the metadata WeakMap only when an instance is constructed.
// Before any construction the graph edges for that class are simply not there.
// ---------------------------------------------------------------------------
describe('E1: @dependsOn edges exist only after construction', () => {
  it('metadata is empty before construction and populated after', () => {
    abstract class IDep {}
    abstract class ISvc {}
    class Svc implements ISvc {
      @dependsOn(IDep) private readonly dep!: IDep;
    }

    // Nothing has constructed Svc yet — its edges are unknown.
    expect(getMetadata(DesignDependenciesKey, Svc)).toBeUndefined();

    // Constructing one instance records the edge.
    new Svc();

    const edges = getMetadata(DesignDependenciesKey, Svc) ?? {};
    expect(Object.values(edges)).toContain(IDep);
  });
});

// ---------------------------------------------------------------------------
// E2 — the REAL engine's build is already lazy, and therefore BLIND to
// @dependsOn edges. buildProvider() constructs nothing, so a registered class's
// edges are still unknown right after build; resolve() is what reveals them.
// This is the crux tension in the live code: a lazy build cannot see the graph.
// ---------------------------------------------------------------------------
describe('E2: lazy build sees no @dependsOn edges; resolve reveals them', () => {
  it('build leaves edges unknown; first resolve records them', () => {
    abstract class IEdgeDep {}
    class EdgeDep implements IEdgeDep {}
    abstract class IEdgeSvc {}
    class EdgeSvc implements IEdgeSvc {
      @dependsOn(IEdgeDep) private readonly dep!: IEdgeDep;
    }

    const services = createServiceCollection();
    services.register(EdgeDep).as(IEdgeDep).singleton();
    services.register(EdgeSvc).as(IEdgeSvc).singleton();

    const provider = services.buildProvider();

    // Build constructed nothing, so EdgeSvc's edge is invisible at build time.
    expect(getMetadata(DesignDependenciesKey, EdgeSvc)).toBeUndefined();

    provider.resolve(IEdgeSvc);

    // Resolving constructed EdgeSvc, which recorded the edge just-in-time.
    const edges = getMetadata(DesignDependenciesKey, EdgeSvc) ?? {};
    expect(Object.values(edges)).toContain(IEdgeDep);
  });
});

// ---------------------------------------------------------------------------
// A minimal graph-driven LAZY provider prototype. It proves the §6 guarantee
// (resolve is a lookup — no re-derive, no clone) is achievable WITHOUT
// constructing singletons at build. Edges are discovered at first construction
// (from the same real metadata store) and cached; warm resolves are pure map
// reads. Instrumented with construction / metadata-read counters.
// ---------------------------------------------------------------------------
type Lifetime = 'singleton' | 'scoped' | 'transient';
type Token = abstract new (...args: any[]) => any;
type Impl = new () => any;

type Counters = { constructions: Record<string, number>; metadataReads: number };

class LazyScope {
  private readonly scopedCache = new Map<Token, unknown>();
  constructor(
    private readonly regs: Map<Token, { impl: Impl; lifetime: Lifetime }>, // SHARED — never cloned
    private readonly singletons: Map<Token, unknown>, // SHARED — never cloned
    private readonly counters: Counters,
  ) {}

  // Sharing the reg map and the singleton map by reference IS the "no clone".
  createScope(): LazyScope {
    return new LazyScope(this.regs, this.singletons, this.counters);
  }

  resolve<T>(token: Token): T {
    const reg = this.regs.get(token);
    if (!reg) {
      throw new Error(`unregistered ${token.name}`);
    }
    // LOOKUP FIRST: a warm singleton/scoped is a pure map read — no re-derive.
    if (reg.lifetime === 'singleton' && this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }
    if (reg.lifetime === 'scoped' && this.scopedCache.has(token)) {
      return this.scopedCache.get(token) as T;
    }
    // MISS: construct now. Construction reveals this class's @dependsOn edges.
    const instance = new reg.impl();
    this.counters.constructions[reg.impl.name] = (this.counters.constructions[reg.impl.name] ?? 0) + 1;
    if (reg.lifetime === 'singleton') {
      this.singletons.set(token, instance);
    } else if (reg.lifetime === 'scoped') {
      this.scopedCache.set(token, instance);
    }
    // Read the edges recorded during construction and wire the dependencies.
    this.counters.metadataReads++;
    const edges = getMetadata(DesignDependenciesKey, reg.impl) ?? {};
    for (const [field, depToken] of Object.entries(edges)) {
      (instance as Record<string, unknown>)[field] = this.resolve(depToken as unknown as Token);
    }
    return instance as T;
  }
}

class LazySpine {
  private readonly regs = new Map<Token, { impl: Impl; lifetime: Lifetime }>();
  private readonly singletons = new Map<Token, unknown>();
  constructor(private readonly counters: Counters) {}

  register(token: Token, impl: Impl, lifetime: Lifetime): this {
    this.regs.set(token, { impl, lifetime });
    return this;
  }

  // build does NOT construct singletons — this is the lazy default under test.
  buildLazy(): LazyScope {
    return new LazyScope(this.regs, this.singletons, this.counters);
  }
}

const freshCounters = (): Counters => ({ constructions: {}, metadataReads: 0 });

// ---------------------------------------------------------------------------
// E3 — a LAZY spine satisfies §6's guarantee (resolve is a lookup, no re-derive,
// no clone) and constructs each singleton exactly once, discovering edges JIT.
// ---------------------------------------------------------------------------
describe('E3: a lazy spine gives lookup-resolve with no clone and no re-derive', () => {
  it('build constructs nothing; warm resolve neither reconstructs nor re-derives', () => {
    abstract class ILeaf {}
    class Leaf implements ILeaf {}
    abstract class IMid {}
    class Mid implements IMid {
      @dependsOn(ILeaf) readonly leaf!: Leaf;
    }
    abstract class IRoot {}
    class Root implements IRoot {
      @dependsOn(IMid) readonly mid!: Mid;
    }

    const counters = freshCounters();
    const spine = new LazySpine(counters).register(ILeaf, Leaf, 'singleton').register(IMid, Mid, 'singleton').register(IRoot, Root, 'singleton');

    const provider = spine.buildLazy();

    // LAZY: build constructed nothing, and the graph is unknown at build.
    expect(counters.constructions).toEqual({});
    expect(getMetadata(DesignDependenciesKey, Root)).toBeUndefined();

    const r1 = provider.resolve<Root>(IRoot);

    // First resolve constructed each once and wired the deep tree correctly.
    expect(r1.mid).toBeInstanceOf(Mid);
    expect(r1.mid.leaf).toBeInstanceOf(Leaf);
    expect(counters.constructions).toEqual({ Root: 1, Mid: 1, Leaf: 1 });
    const warmReads = counters.metadataReads;

    const r2 = provider.resolve<Root>(IRoot);

    // Warm resolve is a pure lookup: same instance, no reconstruction, no
    // additional edge derivation.
    expect(r2).toBe(r1);
    expect(counters.constructions).toEqual({ Root: 1, Mid: 1, Leaf: 1 });
    expect(counters.metadataReads).toBe(warmReads);
  });

  it('createScope shares singletons (no clone, no reconstruction) and isolates scoped', () => {
    abstract class ISingleton {}
    class TheSingleton implements ISingleton {}
    abstract class IScoped {}
    class TheScoped implements IScoped {}

    const counters = freshCounters();
    const spine = new LazySpine(counters).register(ISingleton, TheSingleton, 'singleton').register(IScoped, TheScoped, 'scoped');

    const provider = spine.buildLazy();
    const s1 = provider.resolve<TheSingleton>(ISingleton);

    const scopeA = provider.createScope();
    const scopeB = provider.createScope();

    // Singleton is shared across scopes with no reconstruction — the reg map and
    // singleton cache are shared by reference, never cloned.
    expect(scopeA.resolve(ISingleton)).toBe(s1);
    expect(scopeB.resolve(ISingleton)).toBe(s1);
    expect(counters.constructions.TheSingleton).toBe(1);

    // Scoped is per-scope: one instance within a scope, distinct across scopes.
    const a = scopeA.resolve<TheScoped>(IScoped);
    const b = scopeB.resolve<TheScoped>(IScoped);
    expect(scopeA.resolve(IScoped)).toBe(a);
    expect(a).not.toBe(b);
    expect(counters.constructions.TheScoped).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// E4 — what LAZY defers, and what EAGER would buy. A deep dependency error is
// invisible at a lazy build (the class was never constructed, so the edge is
// unknown); it surfaces only when the token is resolved. Constructing the class
// at build (eager / probe) is exactly what surfaces the edge — and thus the
// error — up front. This is the eager-vs-lazy difference, stated in code.
// ---------------------------------------------------------------------------
describe('E4: a deep error is deferred under lazy, surfaced by build-time construction', () => {
  it('lazy build is silent on a missing deep dep; resolve throws', () => {
    abstract class IMissing {}
    abstract class INeedy {}
    class Needy implements INeedy {
      @dependsOn(IMissing) private readonly missing!: IMissing;
    }

    const counters = freshCounters();
    const spine = new LazySpine(counters).register(INeedy, Needy, 'singleton'); // IMissing NOT registered

    // Lazy build succeeds and is blind: Needy was never constructed.
    const provider = spine.buildLazy();
    expect(getMetadata(DesignDependenciesKey, Needy)).toBeUndefined();

    // The error only appears when the token is resolved.
    expect(() => provider.resolve(INeedy)).toThrow(/unregistered IMissing/);
  });

  it('constructing at build (eager/probe) surfaces the same edge up front', () => {
    abstract class IMissing2 {}
    abstract class INeedy2 {}
    class Needy2 implements INeedy2 {
      @dependsOn(IMissing2) private readonly missing!: IMissing2;
    }

    // Eager construction (the same act a probe/validate performs) records the
    // edge, so the missing target is knowable before any resolve.
    new Needy2();

    const edges = getMetadata(DesignDependenciesKey, Needy2) ?? {};
    expect(Object.values(edges)).toContain(IMissing2);
  });

  it('the real engine confirms it: buildProvider is lenient, resolve throws', () => {
    abstract class IGap {}
    abstract class IConsumer {}
    class Consumer implements IConsumer {
      @dependsOn(IGap) private readonly gap!: IGap;
    }

    const services = createServiceCollection();
    services.register(Consumer).as(IConsumer).singleton(); // IGap unregistered

    const provider = services.buildProvider(); // does not throw — lenient/lazy
    expect(() => provider.resolve(IConsumer)).toThrow(UnregisteredServiceError);
  });
});
