import type { Lifetime } from '../enums';
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
const indexByOwner = (graph: Graph): Map<ServiceIdentifier<SourceType>, GraphNode[]> => {
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

/**
 * The flat, deps-first plan a later engine executes by table lookup to
 * resolve `token`: every node registered under `token`, plus everything
 * transitively needed to construct them, in dependency order. A later engine
 * (not this module) decides which node(s) in the plan a given resolve call
 * actually returns — this is purely the construction order.
 */
export const buildPlan = (graph: Graph, token: ServiceIdentifier<SourceType>): GraphNode[] => {
  const index = indexByOwner(graph);
  const order = topologicalOrder(graph);
  const orderIndex = new Map(order.map((node, i) => [node, i] as const));

  const needed = new Set<GraphNode>();
  const collect = (node: GraphNode): void => {
    if (needed.has(node)) {
      return;
    }
    needed.add(node);
    for (const dep of graph.get(node)?.deps ?? []) {
      for (const depNode of index.get(dep) ?? []) {
        collect(depNode);
      }
    }
  };
  for (const node of index.get(token) ?? []) {
    collect(node);
  }

  return [...needed].sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
};
