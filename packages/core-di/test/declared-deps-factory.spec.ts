import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IDependencyA {
  abstract a(): string;
}
class DependencyA implements IDependencyA {
  a(): string {
    return 'a';
  }
}

abstract class IDependencyB {
  abstract b(): string;
}
class DependencyB implements IDependencyB {
  b(): string {
    return 'b';
  }
}

abstract class IComposed {
  abstract combined(): string;
}
class Composed implements IComposed {
  constructor(
    private readonly depA: IDependencyA,
    private readonly depB: IDependencyB,
  ) {}
  combined(): string {
    return `${this.depA.a()}${this.depB.b()}`;
  }
}

// The declared-deps factory: register(Foo).using([IDep1, IDep2], (d1, d2) => ...).
// The container resolves the declared deps and hands them, positionally, to the
// factory. Because the deps are declared, the factory is transparent: its
// dependencies are visible to validate()'s dependency graph.
describe('using([deps], factory): declared-deps factory', () => {
  describe('the container resolves the declared deps and hands them to the factory', () => {
    const services = createServiceCollection();
    services.register(DependencyA).as(IDependencyA);
    services.register(DependencyB).as(IDependencyB);
    services
      .register(Composed)
      .using([IDependencyA, IDependencyB], (depA, depB) => new Composed(depA, depB))
      .as(IComposed);
    const provider = services.buildProvider();

    it('builds the instance from the resolved deps', () => {
      const expected = 'ab';

      const actual = provider.resolve(IComposed).combined();

      expect(actual).toBe(expected);
    });
  });

  describe('the deps passed in are the container-resolved instances', () => {
    const services = createServiceCollection();
    services.register(DependencyA).as(IDependencyA).singleton();
    services.register(DependencyB).as(IDependencyB).singleton();
    let receivedA: IDependencyA | undefined;
    services
      .register(Composed)
      .using([IDependencyA, IDependencyB], (depA, depB) => {
        receivedA = depA;
        return new Composed(depA, depB);
      })
      .as(IComposed);
    const provider = services.buildProvider();

    it('passes the same instance the container resolves for the dep', () => {
      const expected = provider.resolve(IDependencyA);

      provider.resolve(IComposed);

      expect(receivedA).toBe(expected);
    });
  });

  describe('a singleton declared-deps factory shares one instance', () => {
    const services = createServiceCollection();
    services.register(DependencyA).as(IDependencyA);
    services.register(DependencyB).as(IDependencyB);
    services
      .register(Composed)
      .using([IDependencyA, IDependencyB], (depA, depB) => new Composed(depA, depB))
      .as(IComposed)
      .singleton();
    const provider = services.buildProvider();

    it('resolves to the same instance across resolves', () => {
      const expected = provider.resolve(IComposed);

      const actual = provider.resolve(IComposed);

      expect(actual).toBe(expected);
    });
  });

  // The opaque single-argument form is unchanged and coexists with the new form.
  describe('the opaque using(factory) form still works', () => {
    const services = createServiceCollection();
    services.register(DependencyA).as(IDependencyA);
    services
      .register(Composed)
      .using((scope) => new Composed(scope.resolve(IDependencyA), new DependencyB()))
      .as(IComposed);
    const provider = services.buildProvider();

    it('builds via the opaque factory', () => {
      const expected = 'ab';

      const actual = provider.resolve(IComposed).combined();

      expect(actual).toBe(expected);
    });
  });
});
