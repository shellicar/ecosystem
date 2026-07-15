import type { Lifetime } from '../enums';
import { CircularDependencyError, SelfDependencyError, UnregisteredServiceError } from '../errors';
import type { DescriptorMap, ServiceIdentifier, SourceType } from '../types';
import { DesignDependenciesKey } from './constants';
import { buildPlanMissingFacts } from './messages';
import { getMetadata } from './metadata';
import { pushBucket } from './pushBucket';
import type { Cycle, Graph, GraphFacts, GraphNode, UnregisteredEdge } from './types';

const declaredDeps = (implementation: object): ServiceIdentifier<SourceType>[] => {
  const record = getMetadata<SourceType>(DesignDependenciesKey, implementation) ?? {};
  return Object.values(record);
};

export const deriveFacts = (services: DescriptorMap): Graph => {
  const graph = new Map<GraphNode, GraphFacts>();
  for (const [owner, descriptors] of services) {
    for (const descriptor of descriptors) {
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
        const fieldDeps = declaredDeps(descriptor.implementation);
        graph.set(descriptor, { lifetime: descriptor.lifetime, owner, owners: [owner], deps: [...(descriptor.declaredDeps ?? []), ...fieldDeps], isAsync });
        continue;
      }
      graph.set(descriptor, { lifetime: descriptor.lifetime, owner, owners: [owner], deps: declaredDeps(descriptor.implementation), isAsync });
    }
  }
  return graph;
};

export const indexByOwner = (graph: Graph): Map<ServiceIdentifier<SourceType>, GraphNode[]> => {
  const index = new Map<ServiceIdentifier<SourceType>, GraphNode[]>();
  for (const [node, facts] of graph) {
    for (const owner of facts.owners) {
      pushBucket(index, owner, node);
    }
  }
  return index;
};

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

// Every walker follows the same edges: a node's dep tokens, fanned out to every node
// registered under each token. One generator carries that shape; the walkers keep only
// their own traversal state (cycle capture, post-order, discovery), which genuinely differs.
function* depNodes(graph: Graph, index: OwnerIndex, node: GraphNode): Generator<GraphNode> {
  for (const dep of graph.get(node)?.deps ?? []) {
    for (const depNode of index.get(dep) ?? []) {
      yield depNode;
    }
  }
}

export const detectCycles = (graph: Graph): Cycle[] => {
  const index = indexByOwner(graph);
  const state = new Map<GraphNode, 'visiting' | 'done'>();
  const stack: GraphNode[] = [];
  const cycles: Cycle[] = [];
  const reported = new Set<string>();

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
    for (const depNode of depNodes(graph, index, node)) {
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
    for (const depNode of depNodes(graph, index, node)) {
      visit(depNode);
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

export const reachableFrom = (graph: Graph, start: GraphNode): GraphNode[] => {
  const index = indexByOwner(graph);
  const found: GraphNode[] = [];
  const seen = new Set<GraphNode>([start]);

  const walk = (node: GraphNode): void => {
    for (const depNode of depNodes(graph, index, node)) {
      if (seen.has(depNode)) {
        continue;
      }
      seen.add(depNode);
      found.push(depNode);
      walk(depNode);
    }
  };
  walk(start);
  return found;
};

export type OwnerIndex = ReadonlyMap<ServiceIdentifier<SourceType>, readonly GraphNode[]>;

export type PlanStep =
  | {
      readonly kind: 'build';
      readonly node: GraphNode;
      readonly token: ServiceIdentifier<SourceType>;
      readonly lifetime: Lifetime;
      readonly fields: readonly { readonly field: string; readonly slot: number }[];
      readonly args: readonly number[];
    }
  | {
      readonly kind: 'error';
      readonly token: ServiceIdentifier<SourceType>;
      readonly error: unknown;
    }
  | {
      readonly kind: 'surface';
      readonly token: ServiceIdentifier<SourceType>;
      readonly at: 'root' | 'boundary';
    };

export type Plan = readonly PlanStep[];

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

export const concreteNode = (index: OwnerIndex, token: ServiceIdentifier<SourceType>): GraphNode | undefined => {
  const bucket = index.get(token) ?? [];
  const last = bucket[bucket.length - 1];
  return last === undefined ? undefined : followForward(index, last);
};

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
      throw new Error(buildPlanMissingFacts);
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
    const args: number[] = [];
    for (const identifier of node.declaredDeps ?? []) {
      if (identifier === token) {
        args.push(push({ kind: 'error', token, error: new SelfDependencyError() }));
        continue;
      }
      args.push(emitToken(identifier, nextPath));
    }
    const slot = push({ kind: 'build', node, token, lifetime, fields, args });
    if (cached) {
      sharedSlot.set(node, slot);
    }
    return slot;
  };

  emitNode(rootNode, new Set());
  return steps;
};

export const formatGraph = (graph: Graph, lifetimeOf: (node: GraphNode) => Lifetime): string[] => {
  const lines: string[] = [`Dependency graph (${graph.size} registration${graph.size === 1 ? '' : 's'})`];
  for (const [node, facts] of graph) {
    if (node.forwardTarget != null) {
      lines.push(`${facts.owner.name} -> ${node.forwardTarget.name} (forward)`);
      continue;
    }
    const faces = facts.owners.map((owner) => owner.name).join(', ');
    const asyncMark = facts.isAsync ? ' (async)' : '';
    lines.push(`${faces} -> ${node.implementation.name} [${lifetimeOf(node)}]${asyncMark}`);
    for (const dep of facts.deps) {
      lines.push(`    -> ${dep.name}`);
    }
  }
  return lines;
};
