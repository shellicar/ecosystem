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
  /** The last face this node is registered under — the one `resolve(token)` lands on. */
  readonly owner: ServiceIdentifier<SourceType>;
  /** Every face this node is registered under, in registration order. A multi-face node (one `register()` call, several `as`/`asSelf`) is one descriptor reachable through each of these. */
  readonly owners: readonly ServiceIdentifier<SourceType>[];
  readonly deps: readonly ServiceIdentifier<SourceType>[];
  /** Whether this node's factory is async (`usingAsync`) — read by the async-through-sync-path policy (decisions.md §8). */
  readonly isAsync: boolean;
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
      // A multi-face node is the SAME descriptor under several tokens — the map
      // key collides, so a plain set() would keep only the last face. Accumulate
      // every face instead (the Phase 17 repro: an edge naming an earlier face
      // was invisible to validate()/detectCycles).
      const existing = graph.get(descriptor);
      if (existing !== undefined) {
        graph.set(descriptor, { ...existing, owner, owners: [...existing.owners, owner] });
        continue;
      }
      const isAsync = descriptor.createInstanceAsync != null;
      if (descriptor.forwardTarget != null) {
        graph.set(descriptor, { lifetime: undefined, owner, owners: [owner], deps: [descriptor.forwardTarget], isAsync });
        continue;
      }
      if (descriptor.usesFactory) {
        // A factory-registered class still gets its `@dependsOn` fields injected
        // at runtime — the plan wires them regardless of `usesFactory` — so those
        // field edges are real out-edges. Union them with the declared deps so
        // `validate()` sees the whole graph the engine actually wires: a cycle or
        // captive running through a factory node's field is caught (C4).
        const fieldDeps = declaredDeps(descriptor.implementation);
        graph.set(descriptor, { lifetime: descriptor.lifetime, owner, owners: [owner], deps: [...(descriptor.declaredDeps ?? []), ...fieldDeps], isAsync });
        continue;
      }
      graph.set(descriptor, { lifetime: descriptor.lifetime, owner, owners: [owner], deps: declaredDeps(descriptor.implementation), isAsync });
    }
  }
  return graph;
};

/** Every node registered under `identifier` — a dependency edge fans out to all of them (multiplicity-aware). A multi-face node appears under every one of its faces. */
export const indexByOwner = (graph: Graph): Map<ServiceIdentifier<SourceType>, GraphNode[]> => {
  const index = new Map<ServiceIdentifier<SourceType>, GraphNode[]>();
  for (const [node, facts] of graph) {
    for (const owner of facts.owners) {
      const bucket = index.get(owner);
      if (bucket === undefined) {
        index.set(owner, [node]);
      } else {
        bucket.push(node);
      }
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
 * Every distinct cycle in the graph, deduped by the set of registrations
 * involved. The de-duplication keys on node *identity*, not owner name: two
 * distinct cycles whose classes happen to share names are different registration
 * sets, so both are reported rather than merged (Inv14) — upholding the
 * validate-completeness principle (fix one, re-validate, no hidden second). A
 * dependency edge naming an unregistered identifier is skipped here (see
 * {@link findUnregisteredEdges}); it cannot participate in a cycle.
 */
export const detectCycles = (graph: Graph): Cycle[] => {
  const index = indexByOwner(graph);
  const state = new Map<GraphNode, 'visiting' | 'done'>();
  const stack: GraphNode[] = [];
  const cycles: Cycle[] = [];
  const reported = new Set<string>();

  // A stable id per node (assigned on first sight), so a cycle's signature keys
  // on which actual registrations form it, not on their name strings.
  const nodeIds = new Map<GraphNode, number>();
  const idOf = (node: GraphNode): number => {
    let id = nodeIds.get(node);
    if (id === undefined) {
      id = nodeIds.size;
      nodeIds.set(node, id);
    }
    return id;
  };
  const signature = (nodes: Cycle): string =>
    nodes
      .map(idOf)
      .sort((a, b) => a - b)
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
      readonly fields: readonly { readonly field: string; readonly slot: number }[];
    }
  | {
      readonly kind: 'error';
      readonly token: ServiceIdentifier<SourceType>;
      readonly error: unknown;
    }
  | {
      readonly kind: 'surface';
      readonly token: ServiceIdentifier<SourceType>;
      /** Which boundary's surface the token resolves to: the root, or the boundary resolving this plan. */
      readonly at: 'root' | 'boundary';
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
 * by a composed feature. Two further engine-supplied hooks keep the module free
 * of surface knowledge: `surfaceAt` names the tokens that resolve to a boundary
 * surface rather than a registration (the self-tokens — emitted as `surface`
 * steps, never constructed, never announced to disposal), and `guardToken`
 * turns a token's registration multiplicity into a policy error (the
 * `registrationMode` seam) held as an `error` step.
 */
export const buildPlan = (
  graph: Graph,
  index: OwnerIndex,
  rootNode: GraphNode,
  lifetimeOf: (node: GraphNode) => Lifetime,
  isCached: (lifetime: Lifetime) => boolean,
  surfaceAt?: (token: ServiceIdentifier<SourceType>) => 'root' | 'boundary' | undefined,
  guardToken?: (token: ServiceIdentifier<SourceType>, nodes: readonly GraphNode[]) => unknown | undefined,
): Plan => {
  const steps: PlanStep[] = [];
  const sharedSlot = new Map<GraphNode, number>();

  const ownerOf = (node: GraphNode): ServiceIdentifier<SourceType> => {
    const facts = graph.get(node);
    if (facts === undefined) {
      // Unreachable: every node emitted here is derived from the graph (root node
      // and every edge target), so its facts are present. Throw rather than
      // laundering a `Newable` into a `ServiceIdentifier` on a case that cannot occur.
      throw new Error('buildPlan reached a node with no graph facts; every emitted node is derived from the graph, so this cannot happen.');
    }
    return facts.owner;
  };

  const push = (step: PlanStep): number => {
    steps.push(step);
    return steps.length - 1;
  };

  const emitToken = (identifier: ServiceIdentifier<SourceType>, path: ReadonlySet<GraphNode>): number => {
    const at = surfaceAt?.(identifier);
    if (at !== undefined) {
      return push({ kind: 'surface', token: identifier, at });
    }
    const guardError = guardToken?.(identifier, index.get(identifier) ?? []);
    if (guardError !== undefined) {
      return push({ kind: 'error', token: identifier, error: guardError });
    }
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
    const slot = push({ kind: 'build', node, token, lifetime, fields });
    if (cached) {
      sharedSlot.set(node, slot);
    }
    return slot;
  };

  emitNode(rootNode, new Set());
  return steps;
};
