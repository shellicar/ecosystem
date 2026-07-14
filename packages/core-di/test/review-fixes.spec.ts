import { describe, expect, it } from 'vitest';
import { CaptivePolicy, CircularDependencyError, createServiceCollection, dependsOn, type IDisposable, Lifetime, ValidationProblemKind } from '../src';

// An un-verbed dependency declares no lifetime, so it resolves under the composed
// default (effectively Resolve). Captive detection judges that effective lifetime,
// so a singleton capturing an un-verbed dependency is flagged under Strict.
describe('captive detection judges the effective lifetime of an un-verbed dependency', () => {
  it('Strict flags a singleton capturing an un-verbed dependency', () => {
    abstract class IUnverbedDep {}
    class UnverbedDep implements IUnverbedDep {}
    abstract class IHolder {}
    class Holder implements IHolder {
      @dependsOn(IUnverbedDep) private readonly dep!: IUnverbedDep;
    }
    const services = createServiceCollection({ captivePolicy: CaptivePolicy.Strict });
    services.register(UnverbedDep).as(IUnverbedDep);
    services.register(Holder).as(IHolder).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });
});

// A factory-edge cycle throws a clean CircularDependencyError naming the cycle,
// rather than recursing to stack exhaustion.
describe('factory-edge cycles throw a clean CircularDependencyError', () => {
  it('a declared-deps factory cycle throws CircularDependencyError', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {
      constructor(readonly b: IB) {}
    }
    class B implements IB {
      constructor(readonly a: IA) {}
    }
    const services = createServiceCollection();
    services.register(A).using([IB], (b) => new A(b)).as(IA);
    services.register(B).using([IA], (a) => new B(a)).as(IB);
    const provider = services.buildProvider();

    const actual = () => provider.resolve(IA);

    expect(actual).toThrow(CircularDependencyError);
  });

  it('an opaque factory cycle throws CircularDependencyError', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {
      constructor(readonly b: IB) {}
    }
    class B implements IB {
      constructor(readonly a: IA) {}
    }
    const services = createServiceCollection();
    services.register(A).using((scope) => new A(scope.resolve(IB))).as(IA);
    services.register(B).using((scope) => new B(scope.resolve(IA))).as(IB);
    const provider = services.buildProvider();

    const actual = () => provider.resolve(IA);

    expect(actual).toThrow(CircularDependencyError);
  });
});

// A factory-registered class still gets its @dependsOn fields injected, so those
// field edges are part of the dependency graph. validate() unions them with the
// node's declared deps, so a cycle running through a factory node's field is seen.
describe('validate() sees a factory node\u2019s @dependsOn field edges', () => {
  it('catches a cycle that runs through a factory node\u2019s @dependsOn field', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {
      @dependsOn(IB) private readonly b!: IB;
    }
    class B implements IB {
      @dependsOn(IA) private readonly a!: IA;
    }
    const services = createServiceCollection();
    services.register(A).using(() => new A()).as(IA);
    services.register(B).as(IB);

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.Cycle]);
  });
});

// A lazy singleton first constructed through a scope still belongs to the
// provider: it survives scope dispose and dies at provider dispose.
describe('through-scope lazy-singleton disposal', () => {
  abstract class IDisposableService {
    abstract get disposed(): boolean;
  }
  class DisposableService implements IDisposableService, IDisposable {
    #disposed = false;
    get disposed() {
      return this.#disposed;
    }
    [Symbol.dispose]() {
      this.#disposed = true;
    }
  }

  it('a scope-resolved lazy singleton survives scope dispose and dies at provider dispose', () => {
    const services = createServiceCollection();
    services.register(DisposableService).as(IDisposableService).singleton();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const instance = scope.resolve(IDisposableService);
    scope[Symbol.dispose]();
    const survivedScope = instance.disposed;
    provider[Symbol.dispose]();
    const diedWithProvider = instance.disposed;

    expect([survivedScope, diedWithProvider]).toEqual([false, true]);
  });
});

// Cycle diagnostics de-duplicate on which registrations are in the cycle, not on
// their name strings, so two distinct cycles whose classes share names are both
// reported rather than merged.
describe('cycle diagnostics de-duplicate on identity, not name', () => {
  const makeCyclePair = () => {
    abstract class IX {}
    abstract class IY {}
    class X implements IX {
      @dependsOn(IY) private readonly y!: IY;
    }
    class Y implements IY {
      @dependsOn(IX) private readonly x!: IX;
    }
    return { IX, IY, X, Y };
  };

  it('reports two distinct name-colliding cycles as two problems', () => {
    const first = makeCyclePair();
    const second = makeCyclePair();
    const services = createServiceCollection();
    services.register(first.X).as(first.IX);
    services.register(first.Y).as(first.IY);
    services.register(second.X).as(second.IX);
    services.register(second.Y).as(second.IY);

    const actual = services.validate().problems.filter((p) => p.kind === ValidationProblemKind.Cycle).length;

    expect(actual).toBe(2);
  });
});

// Fixing every reported problem and re-validating yields a clean report — no
// fresh batch hidden behind the first.
describe('validate() completeness', () => {
  it('is clean after the reported captive is fixed', () => {
    abstract class IDep {}
    class Dep implements IDep {}
    abstract class IHolder {}
    class Holder implements IHolder {
      @dependsOn(IDep) private readonly dep!: IDep;
    }
    const services = createServiceCollection();
    services.register(Dep).as(IDep).scoped();
    services.register(Holder).as(IHolder).singleton();

    const before = services.validate().problems.map((p) => p.kind);
    services.overrideLifetime(IDep, Lifetime.Singleton);
    const after = services.validate().valid;

    expect([before, after]).toEqual([[ValidationProblemKind.CaptiveDependency], true]);
  });
});
