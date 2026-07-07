import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, UnregisteredServiceError, ValidationError, ValidationProblemKind } from '../src';

abstract class IDependency {}
class Dependency implements IDependency {}

abstract class IService {}
class Service implements IService {
  @dependsOn(IDependency) private readonly dep!: IDependency;
}

describe('validate() as a diagnostic', () => {
  it('reports valid wiring as valid', () => {
    const services = createServiceCollection();
    services.register(Dependency).as(IDependency);
    services.register(Service).as(IService);

    const actual = services.validate().valid;

    expect(actual).toBe(true);
  });

  it('reports a registration with no declared identity', () => {
    const services = createServiceCollection();
    services.register(Service); // no as / asSelf / forward

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.NoIdentity]);
  });

  it('reports a forward to an unregistered target', () => {
    const services = createServiceCollection();
    services.forward(IService).to(Dependency);

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.MissingTarget]);
  });

  it('reports a captive dependency (singleton depending on scoped)', () => {
    const services = createServiceCollection();
    services.register(Dependency).as(IDependency).scoped();
    services.register(Service).as(IService).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });

  it('reports a dependency cycle', () => {
    abstract class ICycleA {}
    abstract class ICycleB {}
    class CycleA implements ICycleA {
      @dependsOn(ICycleB) private readonly b!: ICycleB;
    }
    class CycleB implements ICycleB {
      @dependsOn(ICycleA) private readonly a!: ICycleA;
    }
    const services = createServiceCollection();
    services.register(CycleA).as(ICycleA);
    services.register(CycleB).as(ICycleB);

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.Cycle]);
  });

  it('reports a dependency cycle that runs through a forward edge', () => {
    abstract class IAlpha {}
    abstract class IBeta {}
    abstract class IForwarded {}
    class Alpha implements IAlpha {
      @dependsOn(IForwarded) private readonly forwarded!: IForwarded;
    }
    class Beta implements IBeta {
      @dependsOn(IAlpha) private readonly alpha!: IAlpha;
    }
    const services = createServiceCollection();
    services.register(Alpha).as(IAlpha);
    services.register(Beta).as(IBeta);
    services.forward(IForwarded).to(IBeta);

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.Cycle]);
  });

  it('reports a transitive captive dependency (singleton through an intermediate to scoped)', () => {
    abstract class IScopedLeaf {}
    abstract class IMiddle {}
    abstract class IRoot {}
    class ScopedLeaf implements IScopedLeaf {}
    class Middle implements IMiddle {
      @dependsOn(IScopedLeaf) private readonly leaf!: IScopedLeaf;
    }
    class Root implements IRoot {
      @dependsOn(IMiddle) private readonly middle!: IMiddle;
    }
    const services = createServiceCollection();
    services.register(ScopedLeaf).as(IScopedLeaf).scoped();
    services.register(Middle).as(IMiddle).transient();
    services.register(Root).as(IRoot).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });

  it('reports a captive dependency reached through a forward (singleton to scoped via a forward)', () => {
    abstract class IScopedTarget {}
    abstract class IAliasToScoped {}
    abstract class IHolder {}
    class ScopedTarget implements IScopedTarget {}
    class Holder implements IHolder {
      @dependsOn(IAliasToScoped) private readonly aliased!: IAliasToScoped;
    }
    const services = createServiceCollection();
    services.register(ScopedTarget).as(IScopedTarget).scoped();
    services.forward(IAliasToScoped).to(IScopedTarget);
    services.register(Holder).as(IHolder).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });

  it('reports a dependency cycle that runs through a declared-deps factory', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {}
    class B implements IB {
      @dependsOn(IA) private readonly a!: IA;
    }
    const services = createServiceCollection();
    // A is built by a declared-deps factory that declares IB; B @dependsOn IA.
    // The factory's declared dep is a graph edge read statically (no probe),
    // so the cycle IA -> IB -> IA is caught through the transparent factory.
    services
      .register(A)
      .using([IB], (_b) => new A())
      .as(IA);
    services.register(B).as(IB);

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.Cycle]);
  });

  it('reports a transitive captive dependency through a declared-deps factory', () => {
    abstract class IScopedLeaf {}
    abstract class IMiddle {}
    abstract class IRoot {}
    class ScopedLeaf implements IScopedLeaf {}
    class Middle implements IMiddle {
      constructor(readonly leaf: IScopedLeaf) {}
    }
    class Root implements IRoot {
      @dependsOn(IMiddle) private readonly middle!: IMiddle;
    }
    const services = createServiceCollection();
    // Root (singleton) -> Middle (transient, declared-deps factory) -> ScopedLeaf.
    // Middle is transient so it is not itself a captive; the capture is only
    // reachable through the factory's declared dep edge.
    services.register(ScopedLeaf).as(IScopedLeaf).scoped();
    services
      .register(Middle)
      .using([IScopedLeaf], (leaf) => new Middle(leaf))
      .as(IMiddle)
      .transient();
    services.register(Root).as(IRoot).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });

  it('does not flag a scoped dependency hidden behind an opaque factory (the chain terminates)', () => {
    abstract class IScopedThing {}
    abstract class IOpaque {}
    abstract class IHolder {}
    class ScopedThing implements IScopedThing {}
    class Opaque implements IOpaque {
      constructor(readonly thing: IScopedThing) {}
    }
    class Holder implements IHolder {
      @dependsOn(IOpaque) private readonly opaque!: IOpaque;
    }
    const services = createServiceCollection();
    // The opaque factory's dependency on the scoped service is invisible, so the
    // dependency chain terminates at the opaque node: the scoped service is not
    // reached transitively.
    services.register(ScopedThing).as(IScopedThing).scoped();
    services
      .register(Opaque)
      .using((scope) => new Opaque(scope.resolve(IScopedThing)))
      .as(IOpaque)
      .singleton();
    services.register(Holder).as(IHolder).singleton();

    const actual = services.validate().valid;

    expect(actual).toBe(true);
  });

  it('flags a singleton depending directly on an opaque scoped factory', () => {
    abstract class IOpaqueScoped {}
    abstract class IHolder {}
    class OpaqueScoped implements IOpaqueScoped {}
    class Holder implements IHolder {
      @dependsOn(IOpaqueScoped) private readonly dep!: IOpaqueScoped;
    }
    const services = createServiceCollection();
    // The opaque node carries its declared (scoped) lifetime, so a singleton
    // holding it directly is still flagged — you just cannot see through it.
    services
      .register(OpaqueScoped)
      .using(() => new OpaqueScoped())
      .as(IOpaqueScoped)
      .scoped();
    services.register(Holder).as(IHolder).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });

});

describe('buildProvider validation', () => {
  it('fails fast when opted in', () => {
    const services = createServiceCollection();
    services.forward(IService).to(Dependency); // missing target

    const actual = () => services.buildProvider({ validate: true });

    expect(actual).toThrow(ValidationError);
  });

  it('stays lenient by default, deferring the failure to resolve', () => {
    const services = createServiceCollection();
    services.forward(IService).to(Dependency); // missing target
    const provider = services.buildProvider();

    const actual = () => provider.resolve(IService);

    expect(actual).toThrow(UnregisteredServiceError);
  });
});
