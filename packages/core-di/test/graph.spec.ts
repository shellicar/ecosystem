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
import { buildPlan, concreteNode, deriveFacts, detectCycles, findUnregisteredEdges, formatGraph, type GraphNode, indexByOwner, type Plan, type PlanStep, topologicalOrder } from '../src/private/graph';
import { createDescriptorMap, type DescriptorMap, type InstanceFactory, type ServiceDescriptor, type ServiceIdentifier, type SourceType } from '../src/types';

// A minimal, direct-to-map registration helper — deliberately bypassing
// ServiceBuilder/ServiceCollection so these tests exercise the graph module
// against its actual input shape, not through the container.
const register = <T extends SourceType>(services: DescriptorMap, identifier: ServiceIdentifier<T>, descriptor: Partial<ServiceDescriptor<T>> & Pick<ServiceDescriptor<T>, 'implementation'>): void => {
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
      @dependsOn(IDep) public readonly dep!: IDep;
    }
    const services = createDescriptorMap();
    register(services, IDep, { implementation: Dep });
    register(services, ISvc, { implementation: Svc });

    const graph = deriveFacts(services);
    const expected = [IDep];
    const actual = [...graph.values()].find((facts) => facts.owner === ISvc)?.deps;

    expect(actual).toEqual(expected);
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
      @dependsOn(IDep) public readonly dep!: IDep;
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
    const expected = [IB];
    const actual = [...graph.entries()].find(([, facts]) => facts.owner === IA)?.[1].deps;

    expect(actual).toEqual(expected);
  });

  it('an opaque factory carries no out-edges but keeps its declared lifetime', () => {
    abstract class IOpaque {}
    class Opaque implements IOpaque {}
    const services = createDescriptorMap();
    register(services, IOpaque, { implementation: Opaque, usesFactory: true, lifetime: Lifetime.Scoped });

    const graph = deriveFacts(services);
    const facts = [...graph.values()][0];

    expect(facts).toEqual({ lifetime: Lifetime.Scoped, owner: IOpaque, owners: [IOpaque], deps: [], isAsync: false });
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

    expect(sourceFacts).toEqual({ lifetime: undefined, owner: ISource, owners: [ISource], deps: [ITarget], isAsync: false });
  });

  it('respects multiplicity: one node per descriptor, not one per token', () => {
    abstract class IMulti {}
    class First implements IMulti {}
    class Second implements IMulti {}
    const services = createDescriptorMap();
    register(services, IMulti, { implementation: First });
    register(services, IMulti, { implementation: Second });

    const graph = deriveFacts(services);
    const nodes = [...graph.keys()].filter((node) => graph.get(node)?.owner === IMulti);
    const expected = [First, Second];
    const actual = nodes.map((node) => node.implementation);

    expect(actual).toEqual(expected);
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

    const expected = [ID, IB, IC, IA];
    const actual = topologicalOrder(graph).map((node) => graph.get(node)?.owner);

    expect(actual).toEqual(expected);
  });

  it('visits the shared dependency exactly once', () => {
    const graph = deriveFacts(makeServices());

    const expected = 1;
    const actual = topologicalOrder(graph).filter((node) => graph.get(node)?.owner === ID).length;

    expect(actual).toBe(expected);
  });
});

describe('buildPlan: a flat plan of per-injection steps', () => {
  // Diamond: A -> B, A -> C, B -> D, C -> D. D is the shared dependency, reached
  // through two injection sites (B.d and C.d).
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

  const notTransient = (lifetime: Lifetime): boolean => lifetime !== Lifetime.Transient;
  // The engine supplies effective lifetime; here every descriptor carries a concrete one.
  const lifetimeOf = (node: ServiceDescriptor<SourceType>): Lifetime => node.lifetime ?? Lifetime.Resolve;
  const buildSteps = (plan: Plan): readonly PlanStep[] => plan.filter((step) => step.kind === 'build');

  const planFor = (services: DescriptorMap, token: ServiceIdentifier<SourceType>): Plan => {
    const graph = deriveFacts(services);
    const index = indexByOwner(graph);
    const root = concreteNode(index, token);
    if (root === undefined) {
      throw new Error('token has no registration');
    }
    return buildPlan(graph, index, root, lifetimeOf, notTransient);
  };

  const diamond = (sharedLifetime: Lifetime): DescriptorMap => {
    const services = createDescriptorMap();
    register(services, ID, { implementation: D, lifetime: sharedLifetime });
    register(services, IB, { implementation: B });
    register(services, IC, { implementation: C });
    register(services, IA, { implementation: A });
    return services;
  };

  it('emits a construction step per injection site for a transient shared dependency', () => {
    const plan = planFor(diamond(Lifetime.Transient), IA);

    const expected = 2;
    const actual = buildSteps(plan).filter((step) => step.token === ID).length;

    expect(actual).toBe(expected);
  });

  it('emits one shared construction step for a cached shared dependency', () => {
    const plan = planFor(diamond(Lifetime.Scoped), IA);

    const expected = 1;
    const actual = buildSteps(plan).filter((step) => step.token === ID).length;

    expect(actual).toBe(expected);
  });

  it('collapses a multi-hop forward chain to its terminal node', () => {
    abstract class ITarget {}
    abstract class IMid {}
    abstract class ISource {}
    abstract class INeedy {}
    class Target implements ITarget {}
    class Needy implements INeedy {
      @dependsOn(ISource) public readonly source!: ISource;
    }
    const services = createDescriptorMap();
    register(services, ITarget, { implementation: Target });
    register(services, IMid, { implementation: Target, forwardTarget: ITarget });
    register(services, ISource, { implementation: Target, forwardTarget: IMid });
    register(services, INeedy, { implementation: Needy });

    const plan = planFor(services, INeedy);

    const expected = [ITarget, INeedy];
    const actual = buildSteps(plan).map((step) => step.token);

    expect(actual).toEqual(expected);
  });

  it('emits an arg slot per declared-deps factory dependency, wired to the dep build step', () => {
    abstract class IDep {}
    abstract class IFactory {}
    class Dep implements IDep {}
    class Factory implements IFactory {}
    const services = createDescriptorMap();
    register(services, IDep, { implementation: Dep, lifetime: Lifetime.Singleton });
    register(services, IFactory, { implementation: Factory, usesFactory: true, declaredDeps: [IDep], lifetime: Lifetime.Singleton });

    const plan = planFor(services, IFactory);
    const factoryStep = plan.find((step) => step.kind === 'build' && step.token === IFactory);
    const args = factoryStep?.kind === 'build' ? factoryStep.args : [];
    const expected = [IDep];
    const actual = args.map((slot) => plan[slot].token);

    expect(actual).toEqual(expected);
  });
});

describe('detectCycles: pure cycle detection over the graph', () => {
  it('finds a direct two-node cycle', () => {
    abstract class IA {}
    abstract class IB {}
    class A implements IA {
      @dependsOn(IB) public readonly b!: IB;
    }
    class B implements IB {
      @dependsOn(IA) public readonly a!: IA;
    }
    const services = createDescriptorMap();
    register(services, IA, { implementation: A });
    register(services, IB, { implementation: B });
    const graph = deriveFacts(services);

    const cycles = detectCycles(graph);
    const expected = [new Set([IA, IB])];
    const actual = cycles.map((cycle) => new Set(cycle.map((node) => graph.get(node)?.owner)));

    expect(actual).toEqual(expected);
  });

  it('finds a cycle that runs through a forward edge', () => {
    abstract class IAlpha {}
    abstract class IBeta {}
    abstract class IForwarded {}
    class Alpha implements IAlpha {
      @dependsOn(IForwarded) public readonly forwarded!: IForwarded;
    }
    class Beta implements IBeta {
      @dependsOn(IAlpha) public readonly alpha!: IAlpha;
    }
    const services = createDescriptorMap();
    register(services, IAlpha, { implementation: Alpha });
    register(services, IBeta, { implementation: Beta });
    register(services, IForwarded, { implementation: Beta, forwardTarget: IBeta });
    const graph = deriveFacts(services);

    const cycles = detectCycles(graph);
    const expected = [new Set([IAlpha, IBeta, IForwarded])];
    const actual = cycles.map((cycle) => new Set(cycle.map((node) => graph.get(node)?.owner)));

    expect(actual).toEqual(expected);
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
      @dependsOn(IB) public readonly b!: IB;
      constructor() {
        constructions++;
      }
    }
    class B implements IB {
      @dependsOn(IA) public readonly a!: IA;
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
    abstract class IOther {}
    class Other implements IOther {}
    class Needy implements INeedy {
      @dependsOn(IMissing) public readonly missing!: IMissing;
    }
    const services = createDescriptorMap();
    register(services, IOther, { implementation: Other });
    register(services, INeedy, { implementation: Needy });
    const graph = deriveFacts(services);

    const needyNode = [...graph.keys()].find((node) => graph.get(node)?.owner === INeedy);
    const expected = [{ from: needyNode, missing: IMissing }];
    const actual = findUnregisteredEdges(graph);

    expect(actual).toEqual(expected);
  });

  it('reports nothing when every dependency resolves to a node', () => {
    abstract class IDep {}
    abstract class INeedy {}
    class Dep implements IDep {}
    class Needy implements INeedy {
      @dependsOn(IDep) public readonly dep!: IDep;
    }
    const services = createDescriptorMap();
    register(services, IDep, { implementation: Dep });
    register(services, INeedy, { implementation: Needy });
    const graph = deriveFacts(services);

    const problems = findUnregisteredEdges(graph);

    expect(problems).toEqual([]);
  });
});

describe('formatGraph: a human-readable visualisation of the static graph', () => {
  // The engine supplies effective lifetime; here an un-verbed node falls to Resolve.
  const lifetimeOf = (node: GraphNode): Lifetime => node.lifetime ?? Lifetime.Resolve;

  it('renders each node with its implementation, lifetime and dependency edges', () => {
    abstract class IClock {}
    abstract class IService {}
    class Clock implements IClock {}
    class Service implements IService {
      @dependsOn(IClock) public readonly clock!: IClock;
    }
    const services = createDescriptorMap();
    register(services, IClock, { implementation: Clock, lifetime: Lifetime.Singleton });
    register(services, IService, { implementation: Service, lifetime: Lifetime.Scoped });
    const graph = deriveFacts(services);

    const expected = ['Dependency graph (2 registrations)', 'IClock -> Clock [SINGLETON]', 'IService -> Service [SCOPED]', '    -> IClock'];
    const actual = formatGraph(graph, lifetimeOf);

    expect(actual).toEqual(expected);
  });

  it('shows a forward as a redirect to its target, carrying no lifetime', () => {
    abstract class ITarget {}
    abstract class IAlias {}
    class Target implements ITarget {}
    const services = createDescriptorMap();
    register(services, ITarget, { implementation: Target, lifetime: Lifetime.Singleton });
    register(services, IAlias, { implementation: Target, forwardTarget: ITarget });
    const graph = deriveFacts(services);

    const expected = ['Dependency graph (2 registrations)', 'ITarget -> Target [SINGLETON]', 'IAlias -> ITarget (forward)'];
    const actual = formatGraph(graph, lifetimeOf);

    expect(actual).toEqual(expected);
  });

  it('lists every face of a multi-face node on one line', () => {
    abstract class IFoo {}
    abstract class IBar {}
    class Foo implements IFoo, IBar {}
    const descriptor = { implementation: Foo, cacheKey: IFoo, lifetime: Lifetime.Singleton, createInstance: () => new Foo() } satisfies ServiceDescriptor<SourceType>;
    const services = createDescriptorMap();
    services.set(IFoo, [descriptor]);
    services.set(IBar, [descriptor]);
    const graph = deriveFacts(services);

    const expected = ['Dependency graph (1 registration)', 'IFoo, IBar -> Foo [SINGLETON]'];
    const actual = formatGraph(graph, lifetimeOf);

    expect(actual).toEqual(expected);
  });

  it('shows the effective lifetime supplied for an un-verbed node', () => {
    abstract class IThing {}
    class Thing implements IThing {}
    const services = createDescriptorMap();
    register(services, IThing, { implementation: Thing, lifetime: undefined });
    const graph = deriveFacts(services);

    const expected = ['Dependency graph (1 registration)', 'IThing -> Thing [RESOLVE]'];
    const actual = formatGraph(graph, lifetimeOf);

    expect(actual).toEqual(expected);
  });
});
