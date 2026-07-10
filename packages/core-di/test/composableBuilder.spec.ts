import { describe, expect, it } from 'vitest';
import { createCollection } from '../src/private/composableBuilder';

abstract class IThing {}
abstract class IOther {}
class Thing {}

describe('createCollection: the composed set generates the verbs', () => {
  it('exposes a runtime verb for a composed lifetime', () => {
    const services = createCollection(['singleton']);
    const expected = 'function';

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = typeof builder.singleton;

    expect(actual).toBe(expected);
  });

  it('has no runtime verb for a lifetime that was not composed', () => {
    const services = createCollection(['singleton']);

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = builder.scoped;

    expect(actual).toBeUndefined();
  });

  it('always exposes transient — the floor, not a composed member', () => {
    const services = createCollection(['singleton']);
    const expected = 'function';

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = typeof builder.transient;

    expect(actual).toBe(expected);
  });

  it('rejects an uncomposed verb at compile time', () => {
    const services = createCollection(['singleton']);

    services
      .register(Thing)
      .as(IThing)
      // @ts-expect-error - 'scoped' was not composed; this builder has no such verb, so referencing it is a type error
      .scoped;
  });

  it('composing without a lifetime leaves the other composed verbs unaffected', () => {
    const services = createCollection(['singleton', 'scoped']);
    const expected = { singleton: 'function', scoped: 'function', resolve: 'undefined' };

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = { singleton: typeof builder.singleton, scoped: typeof builder.scoped, resolve: typeof builder.resolve };

    expect(actual).toEqual(expected);
  });

  it('records the chosen lifetime against the registered node', () => {
    const services = createCollection(['singleton', 'scoped', 'resolve']);
    const expected = 'scoped';

    services.register(Thing).as(IThing).scoped();
    const actual = services.regs.get(IThing)?.lifetime;

    expect(actual).toBe(expected);
  });

  it('shares one node across every face a single register() call declares', () => {
    const services = createCollection(['singleton']);

    services.register(Thing).as(IThing).as(IOther).singleton();
    const expected = services.regs.get(IThing);
    const actual = services.regs.get(IOther);

    expect(actual).toBe(expected);
  });
});
