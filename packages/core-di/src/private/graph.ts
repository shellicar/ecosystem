import type { Lifetime } from '../enums';
import { CircularDependencyError, SelfDependencyError, UnregisteredServiceError } from '../errors';
import type { DescriptorMap, ServiceDescriptor, ServiceIdentifier, SourceType } from '../types';
import { DesignDependenciesKey } from './constants';
import { getMetadata } from './metadata';

/**
 * One registration's static facts: its declared lifetime (`undefined` for a
 * forward, which has none of its own), the identifier it is registered under,
 * and its out-edges. Lifetime is carried as opaque data here — this module
 * never interprets it (no engine, no lifetime policy; see decisions.md §7/§8).
 */
export type GraphFacts = {
  readonly lifetime: Lifetime | undefined;
  readonly owner: ServiceIdentifier<SourceType>;
  readonly deps: readonly ServiceIdentifier<SourceType>[];
};

/**
 * A graph node is the descriptor itself — one node per *registration*, not
 * per token. A token (identifier) can carry several descriptors (multiple
 * registrations, `resolveAll`); collapsing them to one node per token would
 * lose that multiplicity.
 */
export type GraphNode = ServiceDescriptor<SourceType>;

/** The static graph: every registered descriptor mapped to its facts. */
export type Graph = ReadonlyMap<GraphNode, GraphFacts>;

/** One reported cycle, as the sequence of nodes that form it. */
export type Cycle = readonly GraphNode[];

/** One dependency edge pointing at an identifier with no registered node. */
export type UnregisteredEdge = {
  readonly from: GraphNode;
  readonly missing: ServiceIdentifier<SourceType>;
};

const declaredDeps = (implementation: object): ServiceIdentifier<SourceType>[] => {
  const record = getMetadata<SourceType>(DesignDependenciesKey, implementation) ?? {};
  return Object.values(record);
};

/**
 * Derives one {@link GraphFacts} per registered descriptor — zero construction.
 *
 * - A forward carries no lifetime of its own; its one out-edge is its target.
 * - A factory (`using`) carries its declared deps (transparent) or none (opaque
 *   — the chain terminates, but the node still carries its declared lifetime).
 * - An `@dependsOn`-wired class reads its edges off definition-time metadata
 *   (`ctx.metadata`, landed in Phase 9) — no instance is constructed to see them.
 */
export const deriveFacts = (services: DescriptorMap): Graph => {
  const graph = new Map<GraphNode, GraphFacts>();
  for (const [owner, descriptors] of services) {
    for (const descriptor of descriptors) {
      if (descriptor.forwardTarget != null) {
        graph.set(descriptor, { lifetime: undefined, owner, deps: [descriptor.forwardTarget] });
        continue;
      }
      if (descriptor.usesFactory) {
        graph.set(descriptor, { lifetime: descriptor.lifetime, owner, deps: [...(descriptor.declaredDeps ?? [])] });
        continue;
      }
      graph.set(descriptor, { lifetime: descriptor.lifetime, owner, deps: declaredDeps(descriptor.implementation) });
    }
  }
  return graph;
};

/** Every node registered under `identifier` — a dependency edge fans out to all of them (multiplicity-aware). */
export const indexByOwner = (graph: Graph): Map<ServiceIdentifier<SourceType>, GraphNode[]> => {
  const index = new Map<ServiceIdentifier<SourceType>, GraphNode[]>();
  for (const [node, facts] of graph) {
    const bucket = index.get(facts.owner);
    if (bucket === undefined) {
      index.set(facts.owner, [node]);
    } else {
      bucket.push(node);
    }
  }
  return index;
};

/**
 * Every declared out-edge whose target identifier has no registered node.
 * Purely structural — reported for the caller (e.g. `validate()`) to turn
 * into a diagnostic; this module does not throw.
 */
export const findUnregisteredEdges = (graph: Graph): UnregisteredEdge[] => {
  const index = indexByOwner(graph);
  const problems: UnregisteredEdge[] = [];
  for (const [node, facts] of graph) {
    for (const dep of facts.deps) {
      if (!index.has(dep)) {
        problems.push({ from: node, missing: dep });
      }
    }
  }
  return problems;
};

/**
 * Every distinct cycle in the graph, deduped by the set of owners involved.
 * A dependency edge naming an unregistered identifier is skipped here (see
 * {@link findUnregisteredEdges}); it cannot participate in a cycle.
 */
export const detectCycles = (graph: Graph): Cycle[] => {
  const index = indexByOwner(graph);
  const state = new Map<GraphNode, 'visiting' | 'done'>();
  const stack: GraphNode[] = [];
  const cycles: Cycle[] = [];
  const reported = new Set<string>();

  const signature = (nodes: Cycle): string =>
    nodes
      .map((node) => graph.get(node)?.owner.name ?? '')
      .sort()
      .join('|');

  const visit = (node: GraphNode): void => {
    state.set(node, 'visiting');
    stack.push(node);
    for (const dep of graph.get(node)?.deps ?? []) {
      for (const depNode of index.get(dep) ?? []) {
        const depState = state.get(depNode);
        if (depState === 'visiting') {
          const cycle = stack.slice(stack.indexOf(depNode));
          const sig = signature(cycle);
          if (!reported.has(sig)) {
            reported.add(sig);
            cycles.push(cycle);
          }
        } else if (depState === undefined) {
          visit(depNode);
        }
      }
    }
    stack.pop();
    state.set(node, 'done');
  };

  for (const node of graph.keys()) {
    if (!state.has(node)) {
      visit(node);
    }
  }
  return cycles;
};

/**
 * A deps-first order over every node in the graph — zero construction. A node
 * already `visiting` (part of a cycle) is left where the traversal finds it
 * rather than infinitely recursing; {@link detectCycles} is the source of
 * truth for cycles, not this function.
 */
export const topologicalOrder = (graph: Graph): GraphNode[] => {
  const index = indexByOwner(graph);
  const order: GraphNode[] = [];
  const done = new Set<GraphNode>();
  const visiting = new Set<GraphNode>();

  const visit = (node: GraphNode): void => {
    if (done.has(node) || visiting.has(node)) {
      return;
    }
    visiting.add(node);
    for (const dep of graph.get(node)?.deps ?? []) {
      for (const depNode of index.get(dep) ?? []) {
        visit(depNode);
      }
    }
    visiting.delete(node);
    done.add(node);
    order.push(node);
  };

  for (const node of graph.keys()) {
    visit(node);
  }
  return order;
};

/**
 * Every node transitively reachable from `start` by following declared
 * out-edges (deduped). Used by graph policies (e.g. captive-dependency
 * checks) to walk a node's dependency tree without re-deriving edge lookups.
 */
export const reachableFrom = (graph: Graph, start: GraphNode): GraphNode[] => {
  const index = indexByOwner(graph);
  const found: GraphNode[] = [];
  const seen = new Set<GraphNode>([start]);

  const walk = (node: GraphNode): void => {
    for (const dep of graph.get(node)?.deps ?? []) {
      for (const depNode of index.get(dep) ?? []) {
        if (seen.has(depNode)) {
          continue;
        }
        seen.add(depNode);
        found.push(depNode);
        walk(depNode);
      }
    }
  };
  walk(start);
  return found;
};

/** Every node registered under an identifier, in registration order — the owner-index the plan functions look edges up through. */
export type OwnerIndex = ReadonlyMap<ServiceIdentifier<SourceType>, readonly GraphNode[]>;

/**
 * One pre-computed step of a node's execution plan. A `build` step constructs a
 * node, wiring each `@dependsOn` field from an earlier slot in the same plan. An
 * `error` step is a fault determined statically here (a cycle, a self-dependency,
 * an unregistered edge), held as a slot value to surface at execution.
 */
export type PlanStep =
  | {
      readonly kind: 'build';
      readonly node: GraphNode;
      readonly token: ServiceIdentifier<SourceType>;
      readonly lifetime: Lifetime;
      readonly usesFactory: boolean;
      readonly fields: readonly { readonly field: string; readonly slot: number }[];
    }
  | {
      readonly kind: 'error';
      readonly token: ServiceIdentifier<SourceType>;
      readonly error: unknown;
    };

/**
 * A flat, deps-first plan: executing it top to bottom fills a `locals` table,
 * and the last slot is the requested node's resolution. Every edge and every
 * static fault is decided here; execution only looks up and constructs.
 */
export type Plan = readonly PlanStep[];

/** Follow a forward chain to the concrete node it redirects to (guarding a forward loop). */
export const followForward = (index: OwnerIndex, descriptor: GraphNode): GraphNode | undefined => {
  let node: GraphNode | undefined = descriptor;
  const seen = new Set<GraphNode>();
  while (node?.forwardTarget != null) {
    if (seen.has(node)) {
      return undefined;
    }
    seen.add(node);
    const bucket: readonly GraphNode[] = index.get(node.forwardTarget) ?? [];
    node = bucket[bucket.length - 1];
  }
  return node;
};

/** The concrete node a single `resolve(token)` lands on — the last registration, forwards followed. */
export const concreteNode = (index: OwnerIndex, token: ServiceIdentifier<SourceType>): GraphNode | undefined => {
  const bucket = index.get(token) ?? [];
  const last = bucket[bucket.length - 1];
  return last === undefined ? undefined : followForward(index, last);
};

/**
 * Compiles the flat {@link Plan} that resolves `rootNode` — zero construction.
 *
 * Field edges are read from definition-time `@dependsOn` metadata. A dependency
 * `isCached` reports as cached (singleton, scoped, resolve — a feature memoises
 * it) is emitted once and its slot shared across its injection points; a
 * transient dependency (the floor, no feature) is emitted once per injection
 * edge, so each injection point constructs a distinct instance. A dependency
 * already on the compile path is a cycle, a field naming its own owner is a
 * self-dependency, an edge with no registered node is unregistered — each held
 * as an `error` step.
 *
 * Two things the graph cannot decide alone are supplied by the engine, keeping
 * this module free of lifetime interpretation: `lifetimeOf` yields a node's
 * effective lifetime (an un-verbed node resolves under the engine's
 * `defaultLifetime`), and `isCached` reports whether that lifetime is memoised
 * by a composed feature.
 */
export const buildPlan = (graph: Graph, index: OwnerIndex, rootNode: GraphNode, lifetimeOf: (node: GraphNode) => Lifetime, isCached: (lifetime: Lifetime) => boolean): Plan => {
  const steps: PlanStep[] = [];
  const sharedSlot = new Map<GraphNode, number>();

  const ownerOf = (node: GraphNode): ServiceIdentifier<SourceType> => graph.get(node)?.owner ?? (node.implementation as ServiceIdentifier<SourceType>);

  const push = (step: PlanStep): number => {
    steps.push(step);
    return steps.length - 1;
  };

  const emitToken = (identifier: ServiceIdentifier<SourceType>, path: ReadonlySet<GraphNode>): number => {
    const node = concreteNode(index, identifier);
    if (node === undefined) {
      return push({ kind: 'error', token: identifier, error: new UnregisteredServiceError(identifier) });
    }
    return emitNode(node, path);
  };

  const emitNode = (node: GraphNode, path: ReadonlySet<GraphNode>): number => {
    const token = ownerOf(node);
    const lifetime = lifetimeOf(node);
    const cached = isCached(lifetime);
    const existing = sharedSlot.get(node);
    if (cached && existing !== undefined) {
      return existing;
    }
    if (path.has(node)) {
      return push({ kind: 'error', token, error: new CircularDependencyError(token) });
    }
    const nextPath = new Set(path).add(node);
    const fields: { field: string; slot: number }[] = [];
    const dependencies = getMetadata(DesignDependenciesKey, node.implementation) ?? {};
    for (const [field, identifier] of Object.entries(dependencies)) {
      if (identifier === token) {
        fields.push({ field, slot: push({ kind: 'error', token, error: new SelfDependencyError() }) });
        continue;
      }
      fields.push({ field, slot: emitToken(identifier, nextPath) });
    }
    const slot = push({ kind: 'build', node, token, lifetime, usesFactory: node.usesFactory === true, fields });
    if (cached) {
      sharedSlot.set(node, slot);
    }
    return slot;
  };

  emitNode(rootNode, new Set());
  return steps;
};
