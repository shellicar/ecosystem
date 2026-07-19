import { describe, expect, it } from 'vitest';
import { CircularDependencyError, createServiceCollection, dependsOn, SelfDependencyError } from '../src';

// Self-dependency: A depends on A (via interface)
abstract class ISelfDependent {
  abstract value(): string;
}

class SelfDependent implements ISelfDependent {
  @dependsOn(ISelfDependent) public readonly self!: ISelfDependent;

  value(): string {
    return 'self';
  }
}

// Indirect cycle: A depends on B, B depends on A
abstract class ICycleA {
  abstract value(): string;
}

abstract class ICycleB {
  abstract value(): string;
}

class CycleA implements ICycleA {
  @dependsOn(ICycleB) public readonly b!: ICycleB;

  value(): string {
    return 'a';
  }
}

class CycleB implements ICycleB {
  @dependsOn(ICycleA) public readonly a!: ICycleA;

  value(): string {
    return 'b';
  }
}

// Three-node cycle: A → B → C → A
abstract class ICycle3A {
  abstract value(): string;
}

abstract class ICycle3B {
  abstract value(): string;
}

abstract class ICycle3C {
  abstract value(): string;
}

class Cycle3A implements ICycle3A {
  @dependsOn(ICycle3B) public readonly b!: ICycle3B;

  value(): string {
    return 'a';
  }
}

class Cycle3B implements ICycle3B {
  @dependsOn(ICycle3C) public readonly c!: ICycle3C;

  value(): string {
    return 'b';
  }
}

class Cycle3C implements ICycle3C {
  @dependsOn(ICycle3A) public readonly a!: ICycle3A;

  value(): string {
    return 'c';
  }
}

describe('Circular dependency', () => {
  describe('Self-dependency (A → A via interface)', () => {
    it('throws SelfDependencyError', () => {
      const services = createServiceCollection();
      services.register(SelfDependent).as(ISelfDependent);
      const provider = services.buildProvider();

      const actual = () => provider.resolve(ISelfDependent);

      expect(actual).toThrow(SelfDependencyError);
    });
  });

  describe('Indirect cycle (A → B → A)', () => {
    it('throws CircularDependencyError with Resolve lifetime', () => {
      const services = createServiceCollection();
      services.register(CycleA).as(ICycleA);
      services.register(CycleB).as(ICycleB);
      const provider = services.buildProvider();

      const actual = () => provider.resolve(ICycleA);

      expect(actual).toThrow(CircularDependencyError);
    });

    it('throws CircularDependencyError with Singleton lifetime', () => {
      const services = createServiceCollection();
      services.register(CycleA).as(ICycleA).singleton();
      services.register(CycleB).as(ICycleB).singleton();
      const provider = services.buildProvider();

      const actual = () => provider.resolve(ICycleA);

      expect(actual).toThrow(CircularDependencyError);
    });

    it('throws CircularDependencyError with Scoped lifetime', () => {
      const services = createServiceCollection();
      services.register(CycleA).as(ICycleA).scoped();
      services.register(CycleB).as(ICycleB).scoped();
      const provider = services.buildProvider();
      const scoped = provider.createScope();

      const actual = () => scoped.resolve(ICycleA);

      expect(actual).toThrow(CircularDependencyError);
    });

    it('throws CircularDependencyError with Transient lifetime', () => {
      const services = createServiceCollection();
      services.register(CycleA).as(ICycleA).transient();
      services.register(CycleB).as(ICycleB).transient();
      const provider = services.buildProvider();

      const actual = () => provider.resolve(ICycleA);

      expect(actual).toThrow(CircularDependencyError);
    });
  });

  describe('Three-node cycle (A → B → C → A)', () => {
    it('throws CircularDependencyError with Resolve lifetime', () => {
      const services = createServiceCollection();
      services.register(Cycle3A).as(ICycle3A);
      services.register(Cycle3B).as(ICycle3B);
      services.register(Cycle3C).as(ICycle3C);
      const provider = services.buildProvider();

      const actual = () => provider.resolve(ICycle3A);

      expect(actual).toThrow(CircularDependencyError);
    });

    it('throws CircularDependencyError with Transient lifetime', () => {
      const services = createServiceCollection();
      services.register(Cycle3A).as(ICycle3A).transient();
      services.register(Cycle3B).as(ICycle3B).transient();
      services.register(Cycle3C).as(ICycle3C).transient();
      const provider = services.buildProvider();

      const actual = () => provider.resolve(ICycle3A);

      expect(actual).toThrow(CircularDependencyError);
    });
  });
});
