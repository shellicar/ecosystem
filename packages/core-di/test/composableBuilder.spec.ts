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


abstract class IResource {}
class Resource implements IResource {}

// A member-bearing class, so Promise<Widget> and Widget are genuinely distinct
// types — that is what makes the async/sync verb mismatch a real local error
// rather than a structural coincidence for an empty class.
class Widget {
  readonly kind = 'widget' as const;
}

describe('createCollection: usingAsync exists only on an async collection (decisions.md §8)', () => {
  it('has no runtime usingAsync verb on a sync collection', () => {
    const services = createCollection([Lifetime.Singleton]);

    const builder = services.register(Resource).asSelf() as Record<string, unknown>;
    const actual = builder.usingAsync;

    expect(actual).toBeUndefined();
  });

  it('rejects usingAsync on a sync collection at compile time', () => {
    const services = createCollection([Lifetime.Singleton]);

    services
      .register(Resource)
      // @ts-expect-error - a sync collection was not composed async; it has no usingAsync verb at all
      .usingAsync;
  });

  it('exposes a runtime usingAsync verb on an async collection', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const expected = 'function';

    const builder = services.register(Resource) as Record<string, unknown>;
    const actual = typeof builder.usingAsync;

    expect(actual).toBe(expected);
  });
});

describe('createCollection: usingAsync declares async intent at the call site', () => {
  it('records the registration as async', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const expected = true;

    services
      .register(Resource)
      .usingAsync(async () => new Resource())
      .asSelf()
      .singleton();
    const actual = services.regs.get(Resource)?.isAsync;

    expect(actual).toBe(expected);
  });

  it('records the registration as a factory', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const expected = true;

    services
      .register(Resource)
      .usingAsync(async () => new Resource())
      .asSelf();
    const actual = services.regs.get(Resource)?.usesFactory;

    expect(actual).toBe(expected);
  });

  it('records the declared dependencies of an async declared-deps factory', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const expected = [IResource];

    services
      .register(Widget)
      .usingAsync([IResource], async (_resource: IResource) => new Widget())
      .asSelf();
    const actual = services.regs.get(Widget)?.declaredDeps;

    expect(actual).toEqual(expected);
  });

  it('a synchronous factory does not satisfy usingAsync at compile time', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });

    services
      .register(Widget)
      // @ts-expect-error - a sync factory returns Widget, not Promise<Widget>; usingAsync requires async
      .usingAsync(() => new Widget());
  });

  it('an async factory does not satisfy using at compile time', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });

    services
      .register(Widget)
      // @ts-expect-error - an async factory returns Promise<Widget>, not Widget; using requires sync
      .using(async () => new Widget());
  });

  it('usingAsync on an abstract registration returns a newable-flavoured builder whose asSelf registers', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const expected = true;

    services
      .register(IResource)
      .usingAsync(async () => new Resource())
      .asSelf();
    const actual = services.regs.has(IResource);

    expect(actual).toBe(expected);
  });
});
