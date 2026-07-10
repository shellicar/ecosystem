/**
 * Composable builder — EXPERIMENT (evidence, not production code).
 *
 * The question this answers: with lifetimes as composable features, how does
 * the BUILDER know which lifetime verbs are legal? Not by hand-writing an
 * interface per composition — by generating the verbs from the composed set
 * with a mapped type (policy-poc/builder.ts). Declare the set once; the type
 * and the runtime methods both derive from it:
 *
 *   - core-di's builder: .singleton() / .scoped() / .resolve() / .transient()
 *   - lite's builder:    .singleton() / .transient() — .scoped() does not
 *     exist, as a compile error AND as an absent runtime method. No throw
 *     needed; the verb is simply not there.
 */
import { describe, expect, it } from 'vitest';
import { createCollection } from './policy-poc/builder';
import { createFullSet, createLiteSet } from './policy-poc/compositions';
import { PolicyProvider } from './policy-poc/provider';
import type { OnConstruct, Token } from './policy-poc/types';

const makeCounter = () => {
  const counts: Record<string, number> = {};
  const onConstruct: OnConstruct = (name) => {
    counts[name] = (counts[name] ?? 0) + 1;
  };
  return { counts, onConstruct };
};

abstract class IThing {}
class Thing implements IThing {}

describe('the full composition: every composed verb exists and works end to end', () => {
  it('a singleton() registration resolves to one shared instance', () => {
    const services = createCollection(['singleton', 'scoped', 'resolve']);
    services.register(Thing).as(IThing).singleton();
    const { counts, onConstruct } = makeCounter();
    const provider = new PolicyProvider(services.regs, createFullSet().features, 'resolve', onConstruct);

    const first = provider.resolve<IThing>(IThing);
    const second = provider.resolve<IThing>(IThing);

    expect(second).toBe(first);
    expect(counts.Thing).toBe(1);
  });

  it('a transient() registration (the floor) constructs per resolve', () => {
    const services = createCollection(['singleton', 'scoped', 'resolve']);
    services.register(Thing).as(IThing).transient();
    services.register(Thing).as(IThing).scoped();
    services.register(Thing).as(IThing).singleton();
    const { counts, onConstruct } = makeCounter();
    const provider = new PolicyProvider(services.regs, createFullSet().features, 'resolve', onConstruct);

    const first = provider.resolve<IThing>(IThing);
    const second = provider.resolve<IThing>(IThing);

    expect(second).not.toBe(first);
    expect(counts.Thing).toBe(2);
  });
});

describe("the lite composition: an uncomposed verb doesn't throw — it doesn't exist", () => {
  it('rejects .scoped() at compile time', () => {
    const services = createCollection(['singleton']);

    services
      .register(Thing)
      .as(IThing)
      // @ts-expect-error - 'scoped' was not composed; lite's builder has no such verb
      .scoped();
  });

  it('has no runtime .scoped() method either — type and runtime derive from one set', () => {
    const services = createCollection(['singleton']);

    const builder = services.register(Thing).as(IThing);

    expect((builder as Record<string, unknown>).scoped).toBeUndefined();
    expect((builder as Record<string, unknown>).singleton).toBeTypeOf('function');
    expect((builder as Record<string, unknown>).transient).toBeTypeOf('function'); // the floor, always expressible
  });

  it('the composed verbs still work end to end in lite', () => {
    const services = createCollection(['singleton']);
    services.register(Thing).as(IThing).singleton();
    const { counts, onConstruct } = makeCounter();
    const provider = new PolicyProvider(services.regs, createLiteSet().features, 'singleton', onConstruct);

    const first = provider.resolve<IThing>(IThing);
    const second = provider.resolve<IThing>(IThing);

    expect(second).toBe(first);
    expect(counts.Thing).toBe(1);
  });
});
