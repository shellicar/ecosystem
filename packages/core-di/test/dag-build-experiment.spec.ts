/**
 * DAG-build investigation — EXPERIMENT (evidence, not production code).
 *
 * The phase8 eager-vs-lazy experiment showed that "eager" (B) is still deferred
 * lazy resolution underneath: build pre-warms singletons by CALLING resolve(),
 * and resolve constructs-on-miss recursively — a resolve chain wearing an eager
 * coat. Its constructAndWire takes a `resolveDep` callback and recurses.
 *
 * This experiment is the alternative that definition-time @dependsOn (see
 * depends-on-definition-time-experiment) unlocks: a PROPER DAG build.
 *
 *   Phase 1 — derive the graph from declared edges, statically. Cycles and
 *             unregistered deps are found here, with ZERO constructions
 *             (today's validate() must probe-construct to see an edge).
 *   Phase 2 — precompute a deps-first construction plan per token.
 *   Phase 3 — materialise singletons by walking the topo order in a FLAT loop.
 *             Every dependency is already in the table when its dependent is
 *             constructed, so wiring is a table lookup — constructAndWire here
 *             takes pre-resolved instances, not a resolver callback. No
 *             construct-on-miss, no recursion.
 *
 * resolve() is then plan execution: singletons are pure lookups; scoped and
 * transient nodes construct by stepping their precomputed plan — still a flat
 * loop, never a recursive resolve chain.
 */
import { describe, expect, it } from 'vitest';
import type { ServiceIdentifier, SourceType } from '../src/types';

// V8 does not ship Symbol.metadata yet; must exist before any decorated class
// is evaluated. In the real library this line lives in the dependsOn module,
// so importing the decorator installs it — no consumer action needed.
const MetadataKey: symbol = ((Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata'));

const DepsKey = Symbol.for('design:dependencies');

type DepsRecord = Record<string | symbol, ServiceIdentifier<SourceType>>;

// The definition-time decorator — identical to the one proven in
// depends-on-definition-time-experiment.spec.ts.
const dependsOn = <T extends SourceType>(identifier: ServiceIdentifier<T>) => {
  return (_value: undefined, ctx: ClassFieldDecoratorContext): void => {
    // ctx.metadata is typed optional (undefined when Symbol.metadata is
    // missing at class-evaluation time); the polyfill above guarantees it here.
    const meta = ctx.metadata;
    if (meta === undefined) {
      throw new Error('Symbol.metadata is not installed');
    }
    const existing = meta[DepsKey] as DepsRecord | undefined;
    if (existing === undefined || !Object.hasOwn(meta, DepsKey)) {
      meta[DepsKey] = { ...existing };
    }
    (meta[DepsKey] as DepsRecord)[ctx.name] = identifier;
  };
};

type Lifetime = 'singleton' | 'scoped' | 'transient';
type Token = abstract new (...args: any[]) => any;
type Impl = new () => any;
type Node = { readonly impl: Impl; readonly lifetime: Lifetime };
type OnConstruct = (name: string) => void;

const getDeclaredDeps = (impl: Impl): Token[] => {
  const record = (impl as unknown as Record<symbol, Record<symbol, unknown> | undefined>)[MetadataKey]?.[DepsKey] as DepsRecord | undefined;
  return Object.values(record ?? {}) as unknown as Token[];
};

const getDeclaredEdges = (impl: Impl): [string, Token][] => {
  const record = (impl as unknown as Record<symbol, Record<symbol, unknown> | undefined>)[MetadataKey]?.[DepsKey] as DepsRecord | undefined;
  return Object.entries(record ?? {}) as unknown as [string, Token][];
};

const makeCounter = () => {
  const names: string[] = [];
  const counts: Record<string, number> = {};
  const onConstruct: OnConstruct = (name) => {
    names.push(name);
    counts[name] = (counts[name] ?? 0) + 1;
  };
  return { names, counts, onConstruct };
};

// ---------------------------------------------------------------------------
// The DAG provider prototype.
// ---------------------------------------------------------------------------
class DagProvider {
  private readonly order: Token[] = [];
  private readonly plans = new Map<Token, readonly Token[]>();
  private readonly singletons = new Map<Token, unknown>();
  private readonly rootScoped = new Map<Token, unknown>();

  constructor(
    private readonly regs: Map<Token, Node>,
    private readonly onConstruct: OnConstruct,
  ) {}

  build(): this {
    // Phase 1 — derive graph + topo order from declared edges. Purely static:
    // no class is constructed here, which is what definition-time @dependsOn buys.
    const problems: string[] = [];
    const state = new Map<Token, 'visiting' | 'done'>();
    const visit = (token: Token, path: string[]) => {
      const seen = state.get(token);
      if (seen === 'done') return;
      if (seen === 'visiting') {
        problems.push(`cycle: ${[...path, token.name].join(' -> ')}`);
        return;
      }
      const node = this.regs.get(token);
      if (node === undefined) {
        problems.push(`unregistered ${token.name} (needed by ${path.at(-1) ?? '?'})`);
        return;
      }
      state.set(token, 'visiting');
      for (const dep of getDeclaredDeps(node.impl)) {
        visit(dep, [...path, token.name]);
      }
      state.set(token, 'done');
      this.order.push(token);
    };
    for (const token of this.regs.keys()) {
      visit(token, []);
    }
    if (problems.length > 0) {
      throw new Error(problems.join('; '));
    }

    // Phase 2 — a deps-first construction plan per token: the slice of the
    // topo order that token needs, precomputed so resolve() is plan execution.
    const orderIndex = new Map(this.order.map((t, i) => [t, i] as const));
    for (const token of this.regs.keys()) {
      const needed = new Set<Token>();
      const collect = (t: Token) => {
        if (needed.has(t)) return;
        needed.add(t);
        const node = this.regs.get(t);
        if (node) {
          for (const dep of getDeclaredDeps(node.impl)) collect(dep);
        }
      };
      collect(token);
      this.plans.set(
        token,
        [...needed].sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!),
      );
    }

    // Phase 3 — materialise singletons by walking the topo order. A FLAT loop:
    // deps-first ordering guarantees every dependency is already in the table,
    // so wiring is a lookup. No resolve() call, no recursion, no
    // construct-on-miss. (A singleton depending on a scoped/transient is a
    // captive dependency — out of scope here; phase 1 is where it would be reported.)
    for (const token of this.order) {
      const node = this.regs.get(token)!;
      if (node.lifetime !== 'singleton') continue;
      this.singletons.set(token, this.constructAndWire(node.impl, this.singletons));
    }
    return this;
  }

  // Contrast with phase8's constructAndWire: that one took a resolveDep
  // CALLBACK and recursed into resolve(). This one takes a table of instances
  // that already exist — wiring is a read, construction order came from the plan.
  private constructAndWire(impl: Impl, table: ReadonlyMap<Token, unknown>): unknown {
    const instance = new impl();
    this.onConstruct(impl.name);
    for (const [field, dep] of getDeclaredEdges(impl)) {
      (instance as Record<string, unknown>)[field] = table.get(dep);
    }
    return instance;
  }

  resolve<T>(token: Token, scoped: Map<Token, unknown> = this.rootScoped): T {
    const plan = this.plans.get(token);
    if (plan === undefined) {
      throw new Error(`unregistered ${token.name}`);
    }
    // Plan execution: one flat pass, deps-first. `locals` is the instance table
    // for this resolution; every step's deps precede it in the plan.
    const locals = new Map<Token, unknown>();
    for (const step of plan) {
      const node = this.regs.get(step)!;
      if (node.lifetime === 'singleton') {
        locals.set(step, this.singletons.get(step)); // pure lookup — baked at build
      } else if (node.lifetime === 'scoped') {
        if (!scoped.has(step)) {
          scoped.set(step, this.constructAndWire(node.impl, locals));
        }
        locals.set(step, scoped.get(step));
      } else {
        locals.set(step, this.constructAndWire(node.impl, locals)); // transient: fresh each pass
      }
    }
    return locals.get(token) as T;
  }

  createScope() {
    const cache = new Map<Token, unknown>();
    return { resolve: <T>(token: Token): T => this.resolve<T>(token, cache) };
  }
}

// ===========================================================================
// E1 — graph problems are found at build with ZERO constructions.
// Today's validate() must probe-construct to see an edge; phase8's eager build
// constructed Needy once before hitting its missing dep. Here the graph is
// read, not discovered.
// ===========================================================================
describe('E1: build validates the graph statically — zero constructions', () => {
  it('detects a cycle without constructing anything', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {
      @dependsOn(IB) private readonly b!: IB;
    }
    class B implements IB {
      @dependsOn(IA) private readonly a!: IA;
    }
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([
      [IA, { impl: A, lifetime: 'singleton' }],
      [IB, { impl: B, lifetime: 'singleton' }],
    ]);

    expect(() => new DagProvider(regs, onConstruct).build()).toThrow(/cycle: IA -> IB -> IA/);
    expect(counts).toEqual({});
  });

  it('detects an unregistered dependency without constructing anything', () => {
    abstract class IMissing {}
    abstract class INeedy {}
    class Needy implements INeedy {
      @dependsOn(IMissing) private readonly missing!: IMissing;
    }
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[INeedy, { impl: Needy, lifetime: 'singleton' }]]);

    expect(() => new DagProvider(regs, onConstruct).build()).toThrow(/unregistered IMissing \(needed by INeedy\)/);
    expect(counts).toEqual({}); // phase8's eager build constructed Needy once here
  });
});

// ===========================================================================
// E2 — build materialises singletons deps-first, each exactly once, wiring by
// table lookup. resolve() after build adds no construction: a pure lookup.
// Diamond: A -> B, A -> C, B -> D, C -> D.
// ===========================================================================
describe('E2: singletons materialise as flat plan execution at build', () => {
  abstract class ID {}
  abstract class IB {}
  abstract class IC {}
  abstract class IA {}
  class D implements ID {}
  class B implements IB {
    @dependsOn(ID) public readonly d!: ID;
  }
  class C implements IC {
    @dependsOn(ID) public readonly d!: ID;
  }
  class A implements IA {
    @dependsOn(IB) public readonly b!: IB;
    @dependsOn(IC) public readonly c!: IC;
  }
  const makeRegs = (): Map<Token, Node> =>
    new Map<Token, Node>([
      [IA, { impl: A, lifetime: 'singleton' }],
      [IB, { impl: B, lifetime: 'singleton' }],
      [IC, { impl: C, lifetime: 'singleton' }],
      [ID, { impl: D, lifetime: 'singleton' }],
    ]);

  it('constructs each node exactly once, dependencies before dependents', () => {
    const { names, counts, onConstruct } = makeCounter();

    new DagProvider(makeRegs(), onConstruct).build();

    expect(Object.values(counts)).toEqual([1, 1, 1, 1]);
    expect(names.indexOf('D')).toBeLessThan(names.indexOf('B'));
    expect(names.indexOf('D')).toBeLessThan(names.indexOf('C'));
    expect(names.indexOf('B')).toBeLessThan(names.indexOf('A'));
    expect(names.indexOf('C')).toBeLessThan(names.indexOf('A'));
  });

  it('resolve after build is a pure lookup and the diamond shares one D', () => {
    const { names, onConstruct } = makeCounter();
    const provider = new DagProvider(makeRegs(), onConstruct).build();
    const constructionsAtBuild = names.length;

    const a = provider.resolve<A>(IA);

    expect(names.length).toBe(constructionsAtBuild); // resolve constructed nothing
    expect((a.b as B).d).toBeInstanceOf(D);
    expect((a.b as B).d).toBe((a.c as C).d); // one shared instance, wired both places
  });
});

// ===========================================================================
// E3 — scoped and transient nodes are plan execution too: a flat pass over the
// precomputed deps-first plan, never a recursive resolve chain.
// ===========================================================================
describe('E3: scoped/transient resolution is flat plan execution', () => {
  abstract class IShared {}
  abstract class IPerScope {}
  abstract class IPerCall {}
  class Shared implements IShared {}
  class PerScope implements IPerScope {
    @dependsOn(IShared) public readonly shared!: IShared;
  }
  class PerCall implements IPerCall {
    @dependsOn(IPerScope) public readonly perScope!: IPerScope;
  }
  const makeRegs = (): Map<Token, Node> =>
    new Map<Token, Node>([
      [IShared, { impl: Shared, lifetime: 'singleton' }],
      [IPerScope, { impl: PerScope, lifetime: 'scoped' }],
      [IPerCall, { impl: PerCall, lifetime: 'transient' }],
    ]);

  it('a scoped node constructs once per scope; the singleton beneath it is shared across scopes', () => {
    const { counts, onConstruct } = makeCounter();
    const provider = new DagProvider(makeRegs(), onConstruct).build();
    const scope1 = provider.createScope();
    const scope2 = provider.createScope();

    const first = scope1.resolve<PerScope>(IPerScope);
    const again = scope1.resolve<PerScope>(IPerScope);
    const other = scope2.resolve<PerScope>(IPerScope);

    expect(again).toBe(first); // cached within the scope
    expect(other).not.toBe(first); // fresh per scope
    expect(other.shared).toBe(first.shared); // one singleton under both
    expect(counts.PerScope).toBe(2);
    expect(counts.Shared).toBe(1); // baked at build, looked up ever after
  });

  it('a transient constructs fresh each resolve, wired to its scope\'s scoped instance', () => {
    const { counts, onConstruct } = makeCounter();
    const provider = new DagProvider(makeRegs(), onConstruct).build();
    const scope = provider.createScope();

    const one = scope.resolve<PerCall>(IPerCall);
    const two = scope.resolve<PerCall>(IPerCall);

    expect(two).not.toBe(one); // fresh per call
    expect(two.perScope).toBe(one.perScope); // both wired to the scope's one PerScope
    expect(counts.PerCall).toBe(2);
    expect(counts.PerScope).toBe(1);
  });
});
