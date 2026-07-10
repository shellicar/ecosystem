import { describe, expect, it } from 'vitest';
import { Lifetime } from '../src/enums';
import { createCollection } from '../src/private/composableBuilder';

abstract class IThing {}
abstract class IOther {}
abstract class IShape {}
abstract class IDistinguishable {
  abstract distinguishingMember(): void;
}
class Thing {}

describe('createCollection: the composed set generates the verbs', () => {
  it('exposes a runtime verb for a composed lifetime', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = 'function';

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = typeof builder.singleton;

    expect(actual).toBe(expected);
  });

  it('has no runtime verb for a lifetime that was not composed', () => {
    const services = createCollection([Lifetime.Singleton]);

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = builder.scoped;

    expect(actual).toBeUndefined();
  });

  it('always exposes transient — the floor, not a composed member', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = 'function';

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = typeof builder.transient;

    expect(actual).toBe(expected);
  });

  it('rejects an uncomposed verb at compile time', () => {
    const services = createCollection([Lifetime.Singleton]);

    services
      .register(Thing)
      .as(IThing)
      // @ts-expect-error - 'scoped' was not composed; this builder has no such verb, so referencing it is a type error
      .scoped;
  });

  it('rejects .as(Face) when the implementation does not satisfy it at compile time', () => {
    const services = createCollection([Lifetime.Singleton]);

    services
      .register(Thing)
      // @ts-expect-error - Thing has no distinguishingMember, so it does not satisfy IDistinguishable
      .as(IDistinguishable);
  });

  it('composing without a lifetime leaves the other composed verbs unaffected', () => {
    const services = createCollection([Lifetime.Singleton, Lifetime.Scoped]);
    const expected = { singleton: 'function', scoped: 'function', resolve: 'undefined' };

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = { singleton: typeof builder.singleton, scoped: typeof builder.scoped, resolve: typeof builder.resolve };

    expect(actual).toEqual(expected);
  });

  it('records the chosen lifetime against the registered node', () => {
    const services = createCollection([Lifetime.Singleton, Lifetime.Scoped, Lifetime.Resolve]);
    const expected = Lifetime.Scoped;

    services.register(Thing).as(IThing).scoped();
    const actual = services.regs.get(IThing)?.lifetime;

    expect(actual).toBe(expected);
  });

  it('shares one node across every face a single register() call declares', () => {
    const services = createCollection([Lifetime.Singleton]);

    services.register(Thing).as(IThing).as(IOther).singleton();
    const expected = services.regs.get(IThing);
    const actual = services.regs.get(IOther);

    expect(actual).toBe(expected);
  });
});

describe('createCollection: the builder carries the register-side surface', () => {
  it('asSelf registers the implementation under its own token', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = true;

    services.register(Thing).asSelf();
    const actual = services.regs.has(Thing);

    expect(actual).toBe(expected);
  });

  it('rejects asSelf on an abstract registration at compile time', () => {
    const services = createCollection([Lifetime.Singleton]);

    services
      .register(IShape)
      // @ts-expect-error - IShape is abstract; an abstract registration has no asSelf
      .asSelf;
  });

  it('using registers a factory on both a newable and an abstract registration', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = { newable: true, abstract: true };

    services.register(Thing).using(() => new Thing()).asSelf();
    services.register(IShape).using(() => new Thing()).as(IShape);
    const actual = {
      newable: services.regs.get(Thing)?.usesFactory === true,
      abstract: services.regs.get(IShape)?.usesFactory === true,
    };

    expect(actual).toEqual(expected);
  });

  it('using on an abstract registration returns a newable-flavoured builder whose asSelf actually registers', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = true;

    services.register(IShape).using(() => new Thing()).asSelf();
    const actual = services.regs.has(IShape);

    expect(actual).toBe(expected);
  });

  it('lifetime verbs remain composed on the register-side surface', () => {
    const services = createCollection([Lifetime.Singleton, Lifetime.Scoped]);
    const expected = Lifetime.Scoped;

    services.register(Thing).asSelf().scoped();
    const actual = services.regs.get(Thing)?.lifetime;

    expect(actual).toBe(expected);
  });
});

