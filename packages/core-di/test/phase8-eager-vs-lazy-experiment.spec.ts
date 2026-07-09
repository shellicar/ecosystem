/**
 * Phase 8 investigation, iteration 2 — EXPERIMENT (evidence, not production code).
 *
 * Iteration 1 proved a lazy spine is viable. This shows, in code, WHAT DIFFERS
 * between the two designs the SC is weighing, mapped to the real engine surfaces:
 *
 *   buildProvider          — ServiceCollection.ts:264-272
 *   ServiceProvider.resolve / resolveInternal — ServiceProvider.ts:37-74
 *   createScope            — ServiceProvider.ts:137-139
 *
 * (A) lazy default, eager opt-in — build constructs nothing; resolve carries a
 *     construct-on-miss path and MEMOISES the outcome (instance OR error) so warm
 *     resolves stay lookups.
 * (B) eager-only — build constructs the singletons (folds pre-warm into build),
 *     so every singleton's outcome is known at build; the singleton path of
 *     resolve is then a pure lookup with no construct-on-miss.
 *
 * The two prototypes below share one construct+wire routine (mirroring the real
 * ServiceProvider.createInstance + setDependencies: construct, then read the
 * @dependsOn edges recorded at construction and wire them). Both share the reg
 * map and the singleton cache by reference — the "no clone" createScope. The
 * grounding is the real @dependsOn decorator + metadata store.
 */
import { describe, expect, it } from 'vitest';
import { dependsOn } from '../src';
import { DesignDependenciesKey } from '../src/private/constants';
import { getMetadata } from '../src/private/metadata';

type Lifetime = 'singleton' | 'scoped' | 'transient';
type Token = abstract new (...args: any[]) => any;
type Impl = new () => any;
type Node = { readonly impl: Impl; readonly lifetime: Lifetime };
type Outcome = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: Error };
type OnConstruct = (name: string) => void;

// Mirrors ServiceProvider.createInstanceInternal + setDependencies: the instance
// is constructed first (which records its @dependsOn edges), then each edge is
// resolved and injected. A failing dep resolve propagates, exactly as today.
const constructAndWire = (impl: Impl, resolveDep: (token: Token) => unknown, onConstruct: OnConstruct): unknown => {
  const instance = new impl();
  onConstruct(impl.name);
  const edges = getMetadata(DesignDependenciesKey, impl) ?? {};
  for (const [field, depToken] of Object.entries(edges)) {
    (instance as Record<string, unknown>)[field] = resolveDep(depToken as unknown as Token);
  }
  return instance;
};

// ---------------------------------------------------------------------------
// (A) lazy default, eager opt-in.
//   buildProvider surface: constructs nothing (returns a provider over the
//     shared reg map). Same as today's ServiceCollection.buildProvider minus the
//     clone.
//   resolve surface: construct-on-miss (ServiceProvider.ts:41-53) PLUS outcome
//     memoisation — a token that threw holds its error, so warm resolves are
//     lookups and never re-run construction.
//   createScope surface: shares the reg map and singleton cache by reference; a
//     fresh scoped cache. No collection clone.
// ---------------------------------------------------------------------------
class LazyProvider {
  constructor(
    private readonly regs: Map<Token, Node>,
    private readonly onConstruct: OnConstruct,
    private readonly singletonOutcomes = new Map<Token, Outcome>(),
    private readonly scopedOutcomes = new Map<Token, Outcome>(),
  ) {}

  // build constructs nothing — the lazy default.
  build(): this {
    return this;
  }

  createScope(): LazyProvider {
    return new LazyProvider(this.regs, this.onConstruct, this.singletonOutcomes, new Map());
  }

  resolve<T>(token: Token): T {
    const node = this.regs.get(token);
    if (!node) {
      throw new Error(`unregistered ${token.name}`);
    }
    if (node.lifetime === 'singleton') {
      return this.memoised(token, node, this.singletonOutcomes) as T;
    }
    if (node.lifetime === 'scoped') {
      return this.memoised(token, node, this.scopedOutcomes) as T;
    }
    // transient — a new instance every call; nothing to memoise.
    return constructAndWire(node.impl, (t) => this.resolve(t), this.onConstruct) as T;
  }

  private memoised(token: Token, node: Node, cache: Map<Token, Outcome>): unknown {
    const held = cache.get(token);
    if (held) {
      // LOOKUP — a warm hit, including a held error, with no re-derivation.
      if (held.ok) {
        return held.value;
      }
      throw held.error;
    }
    // MISS — construct on first touch and memoise the outcome (instance or error).
    try {
      const value = constructAndWire(node.impl, (t) => this.resolve(t), this.onConstruct);
      cache.set(token, { ok: true, value });
      return value;
    } catch (error) {
      cache.set(token, { ok: false, error: error as Error });
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// (B) eager-only.
//   buildProvider surface: after building the graph, a pre-warm loop constructs
//     every singleton once, baking each outcome (instance or error) — this is
//     the added code, and it is where "singletons are always eager" lives. It is
//     lenient (holds errors, does not throw) to honour §6's default.
//   resolve surface: the singleton path is a PURE LOOKUP — no construct-on-miss
//     after build. BUT scoped and transient still construct on miss (the
//     wrinkle): build cannot pre-construct them (no scope / per-call), so that
//     machinery stays.
//   createScope surface: identical to (A) — shared reg map + singleton cache, no
//     clone.
// ---------------------------------------------------------------------------
class EagerProvider {
  private building = false;
  constructor(
    private readonly regs: Map<Token, Node>,
    private readonly onConstruct: OnConstruct,
    private readonly singletonOutcomes = new Map<Token, Outcome>(),
    private readonly scopedOutcomes = new Map<Token, Outcome>(),
    private readonly isRoot = true,
  ) {}

  // build constructs every singleton once (pre-warm), baking outcomes. This is
  // the "fold pre-warm into build" step — no separate init/resolve pass needed.
  build(): this {
    if (this.isRoot) {
      this.building = true;
      for (const [token, node] of this.regs) {
        if (node.lifetime !== 'singleton' || this.singletonOutcomes.has(token)) {
          continue;
        }
        this.bakeSingleton(token, node);
      }
      this.building = false;
    }
    return this;
  }

  createScope(): EagerProvider {
    return new EagerProvider(this.regs, this.onConstruct, this.singletonOutcomes, new Map(), false);
  }

  resolve<T>(token: Token): T {
    const node = this.regs.get(token);
    if (!node) {
      throw new Error(`unregistered ${token.name}`);
    }
    if (node.lifetime === 'singleton') {
      const held = this.singletonOutcomes.get(token);
      if (held) {
        // PURE LOOKUP — the singleton was resolved at build; no construct here.
        if (held.ok) {
          return held.value as T;
        }
        throw held.error;
      }
      // Only reached during build's topological pre-warm (a not-yet-baked dep).
      const outcome = this.bakeSingleton(token, node);
      if (outcome.ok) {
        return outcome.value as T;
      }
      throw outcome.error;
    }
    // THE WRINKLE: scoped/transient are never pre-warmed by build — they still
    // construct on miss, so this machinery cannot be removed from resolve.
    if (node.lifetime === 'scoped') {
      const held = this.scopedOutcomes.get(token);
      if (held?.ok) {
        return held.value as T;
      }
      const value = constructAndWire(node.impl, (t) => this.resolve(t), this.onConstruct);
      this.scopedOutcomes.set(token, { ok: true, value });
      return value as T;
    }
    return constructAndWire(node.impl, (t) => this.resolve(t), this.onConstruct) as T;
  }

  private bakeSingleton(token: Token, node: Node): Outcome {
    try {
      const value = constructAndWire(node.impl, (t) => this.resolve(t), this.onConstruct);
      const outcome = { ok: true, value } satisfies Outcome;
      this.singletonOutcomes.set(token, outcome);
      return outcome;
    } catch (error) {
      // Lenient: hold the error as the resolution rather than throwing at build.
      const outcome = { ok: false, error: error as Error } satisfies Outcome;
      this.singletonOutcomes.set(token, outcome);
      return outcome;
    }
  }
}

const makeCounter = () => {
  const counts: Record<string, number> = {};
  const onConstruct: OnConstruct = (name) => {
    counts[name] = (counts[name] ?? 0) + 1;
  };
  return { counts, onConstruct };
};

// ===========================================================================
// The pre-warm difference in build: (B) constructs singletons whether or not
// they are ever resolved; (A) does not.
// ===========================================================================
describe('build: eager pre-warms singletons, lazy does not', () => {
  it('eager build constructs a singleton that is never resolved', () => {
    abstract class INever {}
    class Never implements INever {}
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[INever, { impl: Never, lifetime: 'singleton' }]]);

    new EagerProvider(regs, onConstruct).build(); // no resolve() call at all

    const expected = 1;
    expect(counts.Never).toBe(expected);
  });

  it('lazy build does not construct an unresolved singleton', () => {
    abstract class INever {}
    class Never implements INever {}
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[INever, { impl: Never, lifetime: 'singleton' }]]);

    new LazyProvider(regs, onConstruct).build();

    expect(counts.Never).toBeUndefined();
  });
});

// ===========================================================================
// The scoped/transient wrinkle: neither design pre-constructs them at build;
// both keep construct-on-miss for them in resolve.
// ===========================================================================
describe('the scoped/transient wrinkle: neither design pre-constructs them', () => {
  it('eager build does not construct a scoped service', () => {
    abstract class IScopedThing {}
    class ScopedThing implements IScopedThing {}
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[IScopedThing, { impl: ScopedThing, lifetime: 'scoped' }]]);

    new EagerProvider(regs, onConstruct).build();

    expect(counts.ScopedThing).toBeUndefined();
  });

  it('eager resolve still constructs a scoped service on first touch in a scope', () => {
    abstract class IScopedThing {}
    class ScopedThing implements IScopedThing {}
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[IScopedThing, { impl: ScopedThing, lifetime: 'scoped' }]]);
    const scope = new EagerProvider(regs, onConstruct).build().createScope();

    scope.resolve(IScopedThing);

    const expected = 1;
    expect(counts.ScopedThing).toBe(expected);
  });

  it('a transient constructs on every resolve under eager (no pre-warm, no memo)', () => {
    abstract class ITransientThing {}
    class TransientThing implements ITransientThing {}
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[ITransientThing, { impl: TransientThing, lifetime: 'transient' }]]);
    const provider = new EagerProvider(regs, onConstruct).build();

    provider.resolve(ITransientThing);
    provider.resolve(ITransientThing);

    const expected = 2;
    expect(counts.TransientThing).toBe(expected);
  });
});

// ===========================================================================
// The resolve machinery: (A) adds outcome memoisation; (B)'s singleton resolve
// is a pure lookup after build. This is the code (A) carries that a true
// build-time DAG (B) removes — but only for singletons.
// ===========================================================================
describe('resolve: memoisation under lazy vs pure lookup under eager', () => {
  it('lazy memoises a singleton failure — the constructor runs once across repeated resolves', () => {
    abstract class IMissing {}
    abstract class INeedy {}
    class Needy implements INeedy {
      @dependsOn(IMissing) private readonly missing!: IMissing; // IMissing unregistered
    }
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[INeedy, { impl: Needy, lifetime: 'singleton' }]]);
    const provider = new LazyProvider(regs, onConstruct).build();

    expect(() => provider.resolve(INeedy)).toThrow(/unregistered IMissing/);
    expect(() => provider.resolve(INeedy)).toThrow(/unregistered IMissing/);

    const expected = 1; // constructed once; second resolve returned the held error
    expect(counts.Needy).toBe(expected);
  });

  it('eager bakes a singleton failure at build — the constructor runs once, at build', () => {
    abstract class IMissing {}
    abstract class INeedy {}
    class Needy implements INeedy {
      @dependsOn(IMissing) private readonly missing!: IMissing;
    }
    const { counts, onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[INeedy, { impl: Needy, lifetime: 'singleton' }]]);

    const provider = new EagerProvider(regs, onConstruct).build(); // holds the error, does not throw

    expect(() => provider.resolve(INeedy)).toThrow(/unregistered IMissing/);
    // the resolve above threw the HELD error without re-constructing
    const expected = 1;
    expect(counts.Needy).toBe(expected);
  });

  it('eager singleton resolve is a pure lookup — it does not construct on resolve', () => {
    abstract class IThing {}
    class Thing implements IThing {}
    const counter = makeCounter();
    const regs = new Map<Token, Node>([[IThing, { impl: Thing, lifetime: 'singleton' }]]);
    const provider = new EagerProvider(regs, counter.onConstruct).build();
    const constructionsBeforeResolve = counter.counts.Thing;

    provider.resolve(IThing);

    const expected = constructionsBeforeResolve; // resolve added no construction
    expect(counter.counts.Thing).toBe(expected);
  });
});

// ===========================================================================
// Common to both: createScope shares singletons by reference (no clone), and a
// singleton resolved before scoping is the same instance inside a scope.
// ===========================================================================
describe('createScope shares singletons by reference under both designs (no clone)', () => {
  it('lazy: a singleton is the same instance across scopes', () => {
    abstract class IShared {}
    class Shared implements IShared {}
    const { onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[IShared, { impl: Shared, lifetime: 'singleton' }]]);
    const provider = new LazyProvider(regs, onConstruct).build();
    const root = provider.resolve(IShared);

    const inScope = provider.createScope().resolve(IShared);

    expect(inScope).toBe(root);
  });

  it('eager: a singleton is the same instance across scopes', () => {
    abstract class IShared {}
    class Shared implements IShared {}
    const { onConstruct } = makeCounter();
    const regs = new Map<Token, Node>([[IShared, { impl: Shared, lifetime: 'singleton' }]]);
    const provider = new EagerProvider(regs, onConstruct).build();
    const root = provider.resolve(IShared);

    const inScope = provider.createScope().resolve(IShared);

    expect(inScope).toBe(root);
  });
});
