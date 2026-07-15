import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';
import { BuilderError } from '@shellicar/core-di-engine';

// The type is the friendly surface; a runtime exception exists only where forcing
// past the type corrupts runtime behaviour. Each invalid operation gets a pair: a
// type pin proving it does not compile, and a runtime test proving what happens
// when a caller forces past: it throws where forcing past corrupts, and works
// where it does not.

abstract class IThing {}
class Thing implements IThing {}

describe('Invalid operations: forcing past the type corrupts, so the runtime throws', () => {
  describe('usingAsync on a sync builder', () => {
    it('does not expose usingAsync on a sync collection', () => {
      // Never invoked: usingAsync is absent at runtime on a sync collection, so
      // calling it would throw. The pin only needs to exist for the compiler.
      const probe = () => {
        const services = createServiceCollection();
        // @ts-expect-error - usingAsync exists only on a collection created with { async: true }
        services.register(Thing).usingAsync(async () => new Thing());
      };
      void probe;
    });

    it('throws a BuilderError when forced past the type (it would otherwise cache a Promise as the instance)', () => {
      const services = createServiceCollection();

      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      const actual = () => (services.register(Thing) as any).usingAsync(async () => new Thing());

      expect(actual).toThrow(BuilderError);
    });
  });

  describe('any verb on a terminal forward result', () => {
    abstract class IAlias {}
    class Target implements IAlias {}

    it('exposes no verb on a forward result', () => {
      // Never invoked: a verb on a forward result throws at runtime (the runtime
      // enforces what the type hides), so the pin exists only for the compiler.
      const probe = () => {
        const services = createServiceCollection();
        services.register(Target).asSelf().singleton();

        services
          .forward(IAlias)
          .to(Target)
          // @ts-expect-error - a forward is terminal; it carries no lifetime verb
          .singleton();
      };
      void probe;
    });

    it('throws a BuilderError when a lifetime verb is forced past the type', () => {
      const services = createServiceCollection();
      services.register(Target).asSelf().singleton();

      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      const actual = () => (services.forward(IAlias).to(Target) as any).singleton();

      expect(actual).toThrow(BuilderError);
    });

    it('throws a BuilderError when a non-lifetime verb is forced past the type', () => {
      const services = createServiceCollection();
      services.register(Target).asSelf().singleton();

      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      const actual = () => (services.forward(IAlias).to(Target) as any).resolve();

      expect(actual).toThrow(BuilderError);
    });
  });

  describe('sync-building an async collection', () => {
    it('does not expose buildProvider on an async collection', () => {
      // Never invoked: buildProvider on an async collection with an async
      // singleton would throw. The pin only needs to exist for the compiler.
      const probe = () => {
        const services = createServiceCollection({ async: true });
        services
          .register(Thing)
          .usingAsync(async () => new Thing())
          .asSelf()
          .singleton();
        // @ts-expect-error - an async collection exposes only buildProviderAsync
        services.buildProvider();
      };
      void probe;
    });

    it('throws a BuilderError when buildProvider is forced past the type', () => {
      const services = createServiceCollection({ async: true });
      services
        .register(Thing)
        .usingAsync(async () => new Thing())
        .asSelf()
        .singleton();

      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      const actual = () => (services as any).buildProvider();

      expect(actual).toThrow(BuilderError);
    });
  });

  describe('a second lifetime after one is set (.singleton().scoped())', () => {
    it('does not expose a second lifetime verb once one is set', () => {
      // Never invoked: a second lifetime verb throws at runtime (the runtime
      // enforces what the type hides), so the pin exists only for the compiler.
      const probe = () => {
        const services = createServiceCollection();

        services
          .register(Thing)
          .as(IThing)
          .singleton()
          // @ts-expect-error - a lifetime is already set; a second lifetime verb must not be expressible
          .scoped();
      };
      void probe;
    });

    it('throws a BuilderError when a second lifetime is forced past the type (it silently picks last-wins otherwise)', () => {
      const services = createServiceCollection();

      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      const actual = () => (services.register(Thing).as(IThing).singleton() as any).scoped();

      expect(actual).toThrow(BuilderError);
    });
  });
});

describe('Invalid operations: forcing past the type corrupts nothing, so the runtime works', () => {
  describe('asSelf() on an abstract builder', () => {
    abstract class IAbstractThing {}

    it('does not expose asSelf on an abstract registration', () => {
      const services = createServiceCollection();

      services
        .register(IAbstractThing)
        // @ts-expect-error - an abstract class cannot be built as itself; supply .using() first
        .asSelf();
    });

    it('registers and resolves when forced past the type: abstract erases at runtime, so there is nothing to throw for', () => {
      const services = createServiceCollection();
      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      (services.register(IAbstractThing) as any).asSelf();
      const provider = services.buildProvider();

      const actual = () => provider.resolve(IAbstractThing);

      expect(actual).not.toThrow();
    });
  });

  describe('.eager() on a non-singleton', () => {
    it('does not expose eager once the lifetime is not singleton', () => {
      const services = createServiceCollection();

      services
        .register(Thing)
        .as(IThing)
        .scoped()
        // @ts-expect-error - eager is reachable only while the chosen lifetime is singleton
        .eager();
    });

    it('records a harmless dead flag when forced past the type: nothing reads eager on a non-singleton, so there is nothing to throw for', () => {
      const services = createServiceCollection();
      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      (services.register(Thing).as(IThing).scoped() as any).eager();
      const provider = services.buildProvider();

      const actual = () => provider.resolve(IThing);

      expect(actual).not.toThrow();
    });
  });

  describe('a mismatched .as(Face)', () => {
    abstract class IUnrelated {
      abstract distinguishingMember(): void;
    }

    it('rejects a face the implementation does not satisfy', () => {
      const services = createServiceCollection();

      services
        .register(Thing)
        // @ts-expect-error - Thing has no distinguishingMember, so it does not satisfy IUnrelated
        .as(IUnrelated);
    });

    it('registers and resolves the implementation under the mismatched face when forced past the type: JS is structurally free, so there is nothing to throw for', () => {
      const services = createServiceCollection();
      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      (services.register(Thing) as any).as(IUnrelated);
      const provider = services.buildProvider();

      const actual = provider.resolve(IUnrelated);

      expect(actual).toBeInstanceOf(Thing);
    });
  });

  describe('buildProviderAsync() on a sync collection', () => {
    it('does not expose buildProviderAsync on a sync collection', () => {
      const services = createServiceCollection();
      services.register(Thing).as(IThing).singleton();

      // @ts-expect-error - buildProviderAsync exists only on an async collection
      services.buildProviderAsync();
    });

    it('builds and resolves when forced past the type: building a sync collection async is a harmless no-op difference', async () => {
      const services = createServiceCollection();
      services.register(Thing).as(IThing).singleton();

      // biome-ignore lint/suspicious/noExplicitAny: forcing past the type surface is the test's subject
      const provider = await (services as any).buildProviderAsync();
      const actual = provider.resolve(IThing);

      expect(actual).toBeInstanceOf(Thing);
    });
  });
});
