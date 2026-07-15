import type { IResolutionScope } from '../src';
import { createCollection, Lifetime } from '../src';
import { describe, expect, it } from 'vitest';

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

  // Transient is the floor at resolution (no feature caches it), but its verb is
  // composed like any other: defaulting routes through the engine's defaultLifetime,
  // not through an always-present verb.
  it('has no transient verb when transient was not composed', () => {
    const services = createCollection([Lifetime.Singleton]);

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = builder.transient;

    expect(actual).toBeUndefined();
  });

  it('exposes the transient verb when transient is composed', () => {
    const services = createCollection([Lifetime.Singleton, Lifetime.Transient]);
    const expected = 'function';

    const builder = services.register(Thing).as(IThing) as Record<string, unknown>;
    const actual = typeof builder.transient;

    expect(actual).toBe(expected);
  });

  it('rejects an uncomposed verb at compile time', () => {
    const services = createCollection([Lifetime.Singleton]);

    // @ts-expect-error - 'scoped' was not composed; this builder has no such verb, so referencing it is a type error
    services.register(Thing).as(IThing).scoped;
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
    const actual = services.regs.get(IThing)?.[0]?.lifetime;

    expect(actual).toBe(expected);
  });

  it('shares one node across every face a single register() call declares', () => {
    const services = createCollection([Lifetime.Singleton]);

    services.register(Thing).as(IThing).as(IOther).singleton();
    const expected = services.regs.get(IThing)?.[0];
    const actual = services.regs.get(IOther)?.[0];

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

    // @ts-expect-error - IShape is abstract; an abstract registration has no asSelf
    services.register(IShape).asSelf;
  });

  it('using registers a factory on both a newable and an abstract registration', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = { newable: true, abstract: true };

    services
      .register(Thing)
      .using(() => new Thing())
      .asSelf();
    services
      .register(IShape)
      .using(() => new Thing())
      .as(IShape);
    const actual = {
      newable: services.regs.get(Thing)?.[0]?.usesFactory === true,
      abstract: services.regs.get(IShape)?.[0]?.usesFactory === true,
    };

    expect(actual).toEqual(expected);
  });

  it('using on an abstract registration returns a newable-flavoured builder whose asSelf actually registers', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = true;

    services
      .register(IShape)
      .using(() => new Thing())
      .asSelf();
    const actual = services.regs.has(IShape);

    expect(actual).toBe(expected);
  });

  it('lifetime verbs remain composed on the register-side surface', () => {
    const services = createCollection([Lifetime.Singleton, Lifetime.Scoped]);
    const expected = Lifetime.Scoped;

    services.register(Thing).asSelf().scoped();
    const actual = services.regs.get(Thing)?.[0]?.lifetime;

    expect(actual).toBe(expected);
  });
});

// `.eager()` rides on a property of the registration (whether the chosen lifetime is
// singleton), carried on the builder type and preserved across .as()/.asSelf()/.using()
// in any order. It is available whenever the current lifetime is singleton, and gone
// once a later verb overrides it: `.scoped().eager()` and `.singleton().scoped().eager()`
// are compile errors, not silent no-ops.
describe('createCollection: eager rides on the singleton lifetime, order-independently', () => {
  it('records eager when identity is declared before the singleton verb', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = true;

    services.register(Thing).asSelf().singleton().eager();
    const actual = services.regs.get(Thing)?.[0]?.eager;

    expect(actual).toBe(expected);
  });

  it('records eager when identity is declared after the singleton verb', () => {
    const services = createCollection([Lifetime.Singleton]);
    const expected = true;

    services.register(Thing).singleton().asSelf().eager();
    const actual = services.regs.get(Thing)?.[0]?.eager;

    expect(actual).toBe(expected);
  });

  it('leaves a registration not marked eager by default', () => {
    const services = createCollection([Lifetime.Singleton]);

    services.register(Thing).asSelf().singleton();
    const actual = services.regs.get(Thing)?.[0]?.eager;

    expect(actual).toBeUndefined();
  });

  it('rejects eager on a non-singleton lifetime at compile time', () => {
    const services = createCollection([Lifetime.Singleton, Lifetime.Scoped]);

    // @ts-expect-error - the chosen lifetime is scoped, not singleton, so there is no eager verb
    services.register(Thing).asSelf().scoped().eager;
  });

  it('does not expose a second lifetime verb once one is set', () => {
    // A registration has exactly one lifetime: once one is set the lifetime verbs
    // drop off the builder type, so a second is not expressible (and throws if
    // forced past the type). Never invoked: the pin exists only for the compiler.
    const probe = () => {
      const services = createCollection([Lifetime.Singleton, Lifetime.Scoped]);

      services
        .register(Thing)
        .asSelf()
        .singleton()
        // @ts-expect-error - a lifetime is already set; a second lifetime verb is not expressible
        .scoped();
    };
    void probe;
  });
});

abstract class IResource {}
class Resource implements IResource {}

// A member-bearing class, so Promise<Widget> and Widget are genuinely distinct
// types: that is what makes the async/sync verb mismatch a real local error
// rather than a structural coincidence for an empty class.
class Widget {
  readonly kind = 'widget' as const;
}

describe('createCollection: usingAsync exists only on an async collection', () => {
  it('has no runtime usingAsync on a sync collection: absent like an uncomposed lifetime verb, so the runtime shape matches the type surface', () => {
    const services = createCollection([Lifetime.Singleton]);

    const builder = services.register(Resource).asSelf() as Record<string, unknown>;
    const actual = builder.usingAsync;

    expect(actual).toBeUndefined();
  });

  it('rejects usingAsync on a sync collection at compile time', () => {
    const services = createCollection([Lifetime.Singleton]);

    // @ts-expect-error - a sync collection was not composed async; it has no usingAsync verb at all
    services.register(Resource).usingAsync;
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
  it('lands the async factory itself on its own createInstanceAsync field', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const asyncFactory = async () => new Resource();
    const expected = asyncFactory;

    services.register(Resource).usingAsync(asyncFactory).asSelf().singleton();
    const actual = services.regs.get(Resource)?.[0]?.createInstanceAsync;

    expect(actual).toBe(expected);
  });

  // The field split: the async factory has its OWN field, so it
  // cannot occupy the sync createInstance slot: the sync execution path reads
  // createInstance alone and could never cache a returned Promise.
  it('leaves createInstance the default sync constructor when an async factory is supplied', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const asyncFactory = async () => new Resource();

    services.register(Resource).usingAsync(asyncFactory).asSelf();
    const createInstance = services.regs.get(Resource)?.[0]?.createInstance;
    // The default factory ignores its scope argument, so an empty stand-in suffices.
    const actual = createInstance?.({} as IResolutionScope);

    expect(actual).toBeInstanceOf(Resource);
  });

  it('records the registration as a factory', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const expected = true;

    services
      .register(Resource)
      .usingAsync(async () => new Resource())
      .asSelf();
    const actual = services.regs.get(Resource)?.[0]?.usesFactory;

    expect(actual).toBe(expected);
  });

  it('records the declared dependencies of an async declared-deps factory', () => {
    const services = createCollection([Lifetime.Singleton], { async: true });
    const expected = [IResource];

    services
      .register(Widget)
      .usingAsync([IResource], async (_resource: IResource) => new Widget())
      .asSelf();
    const actual = services.regs.get(Widget)?.[0]?.declaredDeps;

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
