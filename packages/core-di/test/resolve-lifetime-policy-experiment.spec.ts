/**
 * Resolve-as-a-lifetime investigation — EXPERIMENT (evidence, not production code).
 *
 * The model under test lives in ./policy-poc, split by layer so the
 * dependencies are visible:
 *
 *   types.ts              layer 0  shared vocabulary       (depends on nothing)
 *   dependsOn.ts          layer 1  definition-time edges   (types)
 *   contracts.ts          layer 2  engine/feature contract (types)
 *   lifetime-singleton.ts layer 3  singleton feature       (types, contracts)
 *   lifetime-resolve.ts   layer 3  resolve feature         (types, contracts)
 *   lifetime-scoped.ts    layer 3  scoped feature+createScope (types, contracts)
 *   compositions.ts       layer 4  full set / lite set     (the three features)
 *   provider.ts           layer 5  the engine              (types, contracts, dependsOn)
 *   facts.ts              layer 6  the read-only bridge    (types, contracts, dependsOn)
 *   graph-policies.ts     layer 7  JUDGEMENT               (facts only)
 *
 * The split under test: the provider owns only the resolution BOUNDARY —
 * edges, the floor, the env bag, and folding contributors at each top-level
 * resolve. A lifetime is a FEATURE bringing its own logic and storage:
 * singleton closes over a table, resolve mints its own pass handle at the
 * boundary, scoped brings createScope along with itself. The engine has no
 * line that changes when a lifetime is added or removed; lite composes
 * [singleton] and genuinely has no createScope.
 *
 * Lifetimes and graph policies stay orthogonal: features state facts
 * (owner) as read-only data; composed graph policies judge them (E5).
 *
 * Scope note: this PoC proves the FEATURE model, so construction is a small
 * recursive wire — the flat plan-execution engine is already proven in
 * dag-build-experiment.spec.ts and the two compose.
 */
import { describe, expect, it } from 'vitest';
import { createFullSet, createLiteSet } from './policy-poc/compositions';
import { dependsOn } from './policy-poc/dependsOn';
import { deriveFacts } from './policy-poc/facts';
import { disposalCaptive, strictCaptive, validate } from './policy-poc/graph-policies';
import { PolicyProvider } from './policy-poc/provider';
import type { LifetimeName, Node, OnConstruct, Token } from './policy-poc/types';

const makeCounter = () => {
  const counts: Record<string, number> = {};
  const onConstruct: OnConstruct = (name) => {
    counts[name] = (counts[name] ?? 0) + 1;
  };
  return { counts, onConstruct };
};

// Shared diamond: Root -> Left -> Dep, Root -> Right -> Dep.
abstract class IDep {}
abstract class ILeft {
  abstract readonly dep: IDep;
}
abstract class IRight {
  abstract readonly dep: IDep;
}
abstract class IRoot {
  abstract readonly left: ILeft;
  abstract readonly right: IRight;
}
class Dep implements IDep {}
class Left implements ILeft {
  @dependsOn(IDep) public readonly dep!: IDep;
}
class Right implements IRight {
  @dependsOn(IDep) public readonly dep!: IDep;
}
class Root implements IRoot {
  @dependsOn(ILeft) public readonly left!: ILeft;
  @dependsOn(IRight) public readonly right!: IRight;
}

const diamond = (depLifetime?: LifetimeName): Map<Token, Node> =>
  new Map<Token, Node>([
    [IDep, { impl: Dep, lifetime: depLifetime }],
    [ILeft, { impl: Left }],
    [IRight, { impl: Right }],
    [IRoot, { impl: Root }],
  ]);

// ===========================================================================
// E1 — resolve is a self-contained feature: its contributor mints a pass
// handle at the boundary, its storage keys on it. Shared within one top-level
// resolve, fresh on the next. (Un-verbed = defaultLifetime: resolve, matching
// v4's default.)
// ===========================================================================
describe('E1: resolve — one instance per pass, fresh across passes', () => {
  it('shares one Dep across the diamond within a single resolve', () => {
    const { counts, onConstruct } = makeCounter();
    const provider = new PolicyProvider(diamond(), createFullSet().features, 'resolve', onConstruct);

    const root = provider.resolve<Root>(IRoot);

    expect(root.left.dep).toBe(root.right.dep);
    expect(counts.Dep).toBe(1);
  });

  it('builds a fresh Dep on the next top-level resolve', () => {
    const { counts, onConstruct } = makeCounter();
    const provider = new PolicyProvider(diamond(), createFullSet().features, 'resolve', onConstruct);

    const first = provider.resolve<Root>(IRoot);
    const second = provider.resolve<Root>(IRoot);

    expect(second.left.dep).not.toBe(first.left.dep);
    expect(counts.Dep).toBe(2);
  });
});

// ===========================================================================
// E2 — the floor is per-INJECTION-POINT, not per-pass. A transient dep shared
// by two nodes in one pass constructs twice. This is the one-line distinction
// that drifts silently without a pin.
// ===========================================================================
describe('E2: transient floor — per injection point within one pass', () => {
  it('constructs the transient dep once per injection point', () => {
    const { counts, onConstruct } = makeCounter();
    const provider = new PolicyProvider(diamond('transient'), createFullSet().features, 'resolve', onConstruct);

    const root = provider.resolve<Root>(IRoot);

    expect(root.left.dep).not.toBe(root.right.dep);
    expect(counts.Dep).toBe(2);
  });
});

// ===========================================================================
// E3 — the features differ only by the life of their storage's owner:
// singleton survives passes and scopes; scoped lives with its scope handle;
// resolve dies with the pass. Same getInstance shape throughout.
// ===========================================================================
describe('E3: singleton, scoped and resolve are the same shape, different owner', () => {
  it('a singleton Dep is one instance across passes and scopes', () => {
    const { counts, onConstruct } = makeCounter();
    const full = createFullSet();
    const provider = new PolicyProvider(diamond('singleton'), full.features, 'resolve', onConstruct);
    const scope = full.createScope(provider);

    const first = provider.resolve<Root>(IRoot);
    const second = scope.resolve<Root>(IRoot);

    expect(second.left.dep).toBe(first.left.dep);
    expect(counts.Dep).toBe(1);
  });

  it('a scoped Dep is shared across passes within a scope, fresh per scope', () => {
    const { counts, onConstruct } = makeCounter();
    const full = createFullSet();
    const provider = new PolicyProvider(diamond('scoped'), full.features, 'resolve', onConstruct);
    const scope1 = full.createScope(provider);
    const scope2 = full.createScope(provider);

    const a = scope1.resolve<Root>(IRoot);
    const b = scope1.resolve<Root>(IRoot);
    const c = scope2.resolve<Root>(IRoot);

    expect(b.left.dep).toBe(a.left.dep);
    expect(c.left.dep).not.toBe(a.left.dep);
    expect(counts.Dep).toBe(2);
  });
});

// ===========================================================================
// E4 — composition: lite is core + [singleton] with defaultLifetime singleton.
// "Everything is a singleton" stays as simple as before, lite genuinely has
// no createScope (it ships with the scoped feature), and declaring an
// uncomposed lifetime is rejected up front.
// ===========================================================================
describe('E4: lite composes [singleton] with default singleton', () => {
  it('shares everything across passes', () => {
    const { counts, onConstruct } = makeCounter();
    const provider = new PolicyProvider(diamond(), createLiteSet().features, 'singleton', onConstruct);

    const first = provider.resolve<Root>(IRoot);
    const second = provider.resolve<Root>(IRoot);

    expect(second).toBe(first);
    expect(counts).toEqual({ Dep: 1, Left: 1, Right: 1, Root: 1 });
  });

  it('rejects a registration declaring a lifetime outside the composed set', () => {
    const { onConstruct } = makeCounter();

    const actual = () => new PolicyProvider(diamond('resolve'), createLiteSet().features, 'singleton', onConstruct);

    expect(actual).toThrow(/unsupported lifetime 'resolve' on IDep/);
  });
});

// ===========================================================================
// E5 — graph policies are separate composables that READ feature facts.
// Two captive variants over the IDENTICAL feature set:
//
//   strictCaptive   — a singleton may only reach singletons.
//   disposalCaptive — flag only deps whose storage owner is disposed while the
//                     holder lives (scope under provider) — the MS-DI-ish rule.
//
// Same graph, same lifetimes: strict flags two problems, disposal flags one,
// composing no captive policy flags none.
// ===========================================================================
describe('E5: captive is a composed policy, not a lifetime fact', () => {
  // Singleton Holder -> scoped ScopedDep, and -> transient FreshDep.
  abstract class IScopedDep {}
  abstract class IFreshDep {}
  abstract class IHolder {}
  class ScopedDep implements IScopedDep {}
  class FreshDep implements IFreshDep {}
  class Holder implements IHolder {
    @dependsOn(IScopedDep) public readonly scopedDep!: IScopedDep;
    @dependsOn(IFreshDep) public readonly freshDep!: IFreshDep;
  }
  const regs = new Map<Token, Node>([
    [IScopedDep, { impl: ScopedDep, lifetime: 'scoped' }],
    [IFreshDep, { impl: FreshDep, lifetime: 'transient' }],
    [IHolder, { impl: Holder, lifetime: 'singleton' }],
  ]);
  const facts = deriveFacts(regs, createFullSet().features, 'resolve');

  it('strictCaptive: a singleton may only reach singletons — both deps flagged', () => {
    const actual = validate(facts, [strictCaptive]);

    expect(actual).toEqual([
      { kind: 'StrictCaptive', token: IScopedDep },
      { kind: 'StrictCaptive', token: IFreshDep },
    ]);
  });

  it('disposalCaptive: only the scope-owned dep is flagged; the transient is not', () => {
    const actual = validate(facts, [disposalCaptive]);

    expect(actual).toEqual([{ kind: 'CaptiveDependency', token: IScopedDep }]);
  });

  it('no captive policy composed: the same graph has no problems', () => {
    const actual = validate(facts, []);

    expect(actual).toEqual([]);
  });
});
