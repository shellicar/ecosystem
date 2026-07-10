/**
 * The graph module — P3. Pure functions over declared edges: no engine, no
 * container, no lifetime interpretation. This is the lite seam as code, so
 * every test drives the module directly against a hand-built `DescriptorMap`,
 * never through `createServiceCollection`.
 *
 * Promoted from `dag-build-experiment.spec.ts` (now retired), generalised to
 * respect multiplicity — a token maps to `descriptors[]`, not one graph node.
 */
import { describe, expect, it } from 'vitest';
import { dependsOn } from '../src/dependsOn';
import { Lifetime } from '../src/enums';
import { buildPlan, deriveFacts, detectCycles, findUnregisteredEdges, topologicalOrder } from '../src/private/graph';
import { createDescriptorMap, type DescriptorMap, type InstanceFactory, type ServiceDescriptor, type ServiceIdentifier, type SourceType } from '../src/types';

// A minimal, direct-to-map registration helper — deliberately bypassing
// ServiceBuilder/ServiceCollection so these tests exercise the graph module
// against its actual input shape, not through the container.
const register = <T extends SourceType>(
  services: DescriptorMap,
  identifier: ServiceIdentifier<T>,
  descriptor: Partial<ServiceDescriptor<T>> & Pick<ServiceDescriptor<T>, 'implementation'>,
): void => {
  const full: ServiceDescriptor<T> = {
    cacheKey: identifier,
    lifetime: Lifetime.Singleton,
    createInstance: (() => undefined) as unknown as InstanceFactory<T>,
    ...descriptor,
  };
  const existing = services.get(identifier) ?? [];
  existing.push(full as ServiceDescriptor<SourceType>);
  services.set(identifier, existing as ServiceDescriptor<SourceType>[]);
};

describe('deriveFacts: zero-construction facts per registered descriptor', () => {
  it('reads an @dependsOn class dependency off definition-time metadata', () => {
    abstract class IDep {}
    abstract class ISvc {}
    class Dep implements IDep {}
    class Svc implements ISvc {
      @dependsOn(IDep) private readonly dep!: IDep;
    }
    const services = createDescriptorMap();
    register(services, IDep, { implementation: Dep });
    register(services, ISvc, { implementation: Svc });

    const graph = deriveFacts(services);
    const svcFacts = [...graph.values()].find((facts) => facts.owner === ISvc);

    expect(svcFacts?.deps).toEqual([IDep]);
  });

  it('constructs nothing while deriving facts', () => {
    abstract class IDep {}
    abstract class ISvc {}
    let constructions = 0;
    class Dep implements IDep {
      constructor() {
        constructions++;
      }
    }
    class Svc implements ISvc {
      @dependsOn(IDep) private readonly dep!: IDep;
      constructor() {
        constructions++;
      }
    }
    const services = createDescriptorMap();
    register(services, IDep, { implementation: Dep });
    register(services, ISvc, { implementation: Svc });

    deriveFacts(services);

    expect(constructions).toBe(0);
  });

  it('a declared-deps factory carries its declared deps as out-edges', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {}
    class B implements IB {}
    const services = createDescriptorMap();
    register(services, IB, { implementation: B, usesFactory: true, declaredDeps: [] });
    register(services, IA, { implementation: A, usesFactory: true, declaredDeps: [IB] });

    const graph = deriveFacts(services);
    const aFacts = [...graph.entries()].find(([, facts]) => facts.owner === IA)?.[1];

    expect(aFacts?.deps).toEqual([IB]);
  });

  it('an opaque factory carries no out-edges but keeps its declared lifetime', () => {
    abstract class IOpaque {}
    class Opaque implements IOpaque {}
    const services = createDescriptorMap();
    register(services, IOpaque, { implementation: Opaque, usesFactory: true, lifetime: Lifetime.Scoped });

    const graph = deriveFacts(services);
    const facts = [...graph.values()][0];

    expect(facts).toEqual({ lifetime: Lifetime.Scoped, owner: IOpaque, deps: [] });
  });

  it('a forward carries no lifetime of its own and one out-edge to its target', () => {
    abstract class ITarget {}
    abstract class ISource {}
    class Target implements ITarget {}
    const services = createDescriptorMap();
    register(services, ITarget, { implementation: Target });
    register(services, ISource, { implementation: Target, forwardTarget: ITarget });

    const graph = deriveFacts(services);
    const sourceFacts = [...graph.entries()].find(([, facts]) => facts.owner === ISource)?.[1];

    expect(sourceFacts).toEqual({ lifetime: undefined, owner: ISource, deps: [ITarget] });
  });

  it('respects multiplicity: one node per descriptor, not one per token', () => {
    abstract class IMulti {}
    class First implements IMulti {}
    class Second implements IMulti {}
    const services = createDescriptorMap();
    register(services, IMulti, { implementation: First });
    register(services, IMulti, { implementation: Second });

    const graph = deriveFacts(services);
    const owners = [...graph.values()].filter((facts) => facts.owner === IMulti);

    expect(owners.length).toBe(2);
  });
});

describe('topologicalOrder: deps-first order, zero construction', () => {
  // Diamond: A -> B, A -> C, B -> D, C -> D.
  abstract class ID {}
  abstract class IB {}
  abstract class IC {}
  abstract class IA {}
  class D implements ID {}
  class B implements IB {
    @dependsOn(ID) public readonly d!: ID;
  }
  class C implements IC {
    @dependsOn(ID) public readonly d!: ID;
  }
  class A implements IA {
    @dependsOn(IB) public readonly b!: IB;
    @dependsOn(IC) public readonly c!: IC;
  }
  const makeServices = (): DescriptorMap => {
    const services = createDescriptorMap();
    register(services, ID, { implementation: D });
    register(services, IB, { implementation: B });
    register(services, IC, { implementation: C });
    register(services, IA, { implementation: A });
    return services;
  };

  it('orders every dependency before its dependent', () => {
    const graph = deriveFacts(makeServices());

    const order = topologicalOrder(graph).map((node) => graph.get(node)?.owner);

    expect(order.indexOf(ID)).toBeLessThan(order.indexOf(IB));
    expect(order.indexOf(ID)).toBeLessThan(order.indexOf(IC));
    expect(order.indexOf(IB)).toBeLessThan(order.indexOf(IA));
    expect(order.indexOf(IC)).toBeLessThan(order.indexOf(IA));
  });

  it('visits the shared dependency exactly once', () => {
    const graph = deriveFacts(makeServices());

    const order = topologicalOrder(graph).filter((node) => graph.get(node)?.owner === ID);

    expect(order.length).toBe(1);
  });
});

describe('buildPlan: the deps-first plan for a token', () => {
  abstract class IShared {}
  abstract class IPerScope {}
  abstract class IPerCall {}
  class Shared implements IShared {}
  class PerScope implements IPerScope {
    @dependsOn(IShared) public readonly shared!: IShared;
  }
  class PerCall implements IPerCall {
    @dependsOn(IPerScope) public readonly perScope!: IPerScope;
  }
  const makeServices = (): DescriptorMap => {
    const services = createDescriptorMap();
    register(services, IShared, { implementation: Shared });
    register(services, IPerScope, { implementation: PerScope });
    register(services, IPerCall, { implementation: PerCall });
    return services;
  };

  it('includes only the transitive deps a leaf token needs', () => {
    const graph = deriveFacts(makeServices());

    const plan = buildPlan(graph, IShared).map((node) => graph.get(node)?.owner);

    expect(plan).toEqual([IShared]);
  });

  it('orders a token\'s full plan deps-first', () => {
    const graph = deriveFacts(makeServices());

    const plan = buildPlan(graph, IPerCall).map((node) => graph.get(node)?.owner);

    expect(plan).toEqual([IShared, IPerScope, IPerCall]);
  });

  it('includes every descriptor registered under a multiply-registered token', () => {
    abstract class IMulti {}
    class First implements IMulti {}
    class Second implements IMulti {}
    const services = createDescriptorMap();
    register(services, IMulti, { implementation: First });
    register(services, IMulti, { implementation: Second });
    const graph = deriveFacts(services);

    const plan = buildPlan(graph, IMulti);

    expect(plan.length).toBe(2);
  });
});

describe('detectCycles: pure cycle detection over the graph', () => {
  it('finds a direct two-node cycle', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {
      @dependsOn(IB) private readonly b!: IB;
    }
    class B implements IB {
      @dependsOn(IA) private readonly a!: IA;
    }
    const services = createDescriptorMap();
    register(services, IA, { implementation: A });
    register(services, IB, { implementation: B });
    const graph = deriveFacts(services);

    const cycles = detectCycles(graph);

    expect(cycles.length).toBe(1);
  });

  it('finds a cycle that runs through a forward edge', () => {
    abstract class IAlpha {}
    abstract class IBeta {}
    abstract class IForwarded {}
    class Alpha implements IAlpha {
      @dependsOn(IForwarded) private readonly forwarded!: IForwarded;
    }
    class Beta implements IBeta {
      @dependsOn(IAlpha) private readonly alpha!: IAlpha;
    }
    const services = createDescriptorMap();
    register(services, IAlpha, { implementation: Alpha });
    register(services, IBeta, { implementation: Beta });
    register(services, IForwarded, { implementation: Beta, forwardTarget: IBeta });
    const graph = deriveFacts(services);

    const cycles = detectCycles(graph);

    expect(cycles.length).toBe(1);
  });

  it('reports no cycles for an acyclic graph', () => {
    abstract class ID {}
    class D implements ID {}
    const services = createDescriptorMap();
    register(services, ID, { implementation: D });
    const graph = deriveFacts(services);

    const cycles = detectCycles(graph);

    expect(cycles).toEqual([]);
  });

  it('constructs nothing while detecting a cycle', () => {
    abstract class IA {}
    abstract class IB {}
    let constructions = 0;
    class A implements IA {
      @dependsOn(IB) private readonly b!: IB;
      constructor() {
        constructions++;
      }
    }
    class B implements IB {
      @dependsOn(IA) private readonly a!: IA;
      constructor() {
        constructions++;
      }
    }
    const services = createDescriptorMap();
    register(services, IA, { implementation: A });
    register(services, IB, { implementation: B });
    const graph = deriveFacts(services);

    detectCycles(graph);

    expect(constructions).toBe(0);
  });
});

describe('findUnregisteredEdges: structural detection of dangling deps', () => {
  it('reports an edge whose target has no registered node', () => {
    abstract class IMissing {}
    abstract class INeedy {}
    class Needy implements INeedy {
      @dependsOn(IMissing) private readonly missing!: IMissing;
    }
    const services = createDescriptorMap();
    register(services, INeedy, { implementation: Needy });
    const graph = deriveFacts(services);

    const problems = findUnregisteredEdges(graph);

    expect(problems).toEqual([{ from: [...graph.keys()][0], missing: IMissing }]);
  });

  it('reports nothing when every dependency resolves to a node', () => {
    abstract class IDep {}
    abstract class INeedy {}
    class Dep implements IDep {}
    class Needy implements INeedy {
      @dependsOn(IDep) private readonly dep!: IDep;
    }
    const services = createDescriptorMap();
    register(services, IDep, { implementation: Dep });
    register(services, INeedy, { implementation: Needy });
    const graph = deriveFacts(services);

    const problems = findUnregisteredEdges(graph);

    expect(problems).toEqual([]);
  });
});
