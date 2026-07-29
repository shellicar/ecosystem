import { Lifetime } from '../enums';
import { CircularDependencyError, SelfDependencyError, UnregisteredServiceError } from '../errors';
import type { DescriptorMap, ServiceIdentifier, SourceType } from '../types';
import type { SurfaceReach } from './boundaryEngine';
import { DesignDependenciesKey } from './constants';
import { followForward } from './followForward';
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

export { followForward } from './followForward';
export type { OwnerIndex } from './strategy';

import type { OwnerIndex } from './strategy';

/**
 * `pass` names which resolution pass a step belongs to. A plan is flat, so a
 * singleton's dependencies are slots of their own, evaluated before the step that
 * consumes them: without the mark they would be evaluated against whichever boundary
 * replayed the plan, and the singleton would hold whatever that boundary gave it.
 *
 * `undefined` is the caller's pass. Every singleton opens one of its own, at the root,
 * and its subtree shares it: a singleton is constructed once, so a resolve-lifetime
 * dependency inside it is shared with that construction and nothing else. Two
 * singletons never share one, whether they were built by the same resolve or prebaked
 * separately, so what a singleton holds never depends on how it came to be built.
 */
export type PlanStep =
  | {
      readonly kind: 'build';
      readonly node: GraphNode;
      readonly token: ServiceIdentifier<SourceType>;
      readonly lifetime: Lifetime;
      readonly fields: readonly { readonly field: string; readonly slot: number }[];
      readonly args: readonly number[];
      readonly pass: number | undefined;
    }
  | {
      readonly kind: 'error';
      readonly token: ServiceIdentifier<SourceType>;
      readonly error: unknown;
    }
  | {
      readonly kind: 'surface';
      readonly token: ServiceIdentifier<SourceType>;
      readonly at: SurfaceReach;
      readonly pass: number | undefined;
    };

export type Plan = readonly PlanStep[];

/**
 * Groups a token's bucket by `shadowDepth` (the nesting depth of the collection that
 * registered each descriptor; root is 0). Shared by `winnerOf` and the multiplicity
 * guard so both walk the same generations in the same order.
 */
export const groupByDepth = (bucket: readonly GraphNode[]): Map<number, GraphNode[]> => {
  const groups = new Map<number, GraphNode[]>();
  for (const node of bucket) {
    const depth = node.shadowDepth ?? 0;
    const group = groups.get(depth);
    if (group === undefined) {
      groups.set(depth, [node]);
    } else {
      group.push(node);
    }
  }
  return groups;
};

/**
 * Which descriptor in a token's bucket wins at resolve(). With no `.shadow()` anywhere
 * in the bucket, unchanged from before shadow existed: whichever was registered last.
 * Once a shadow is in play, ancestry decides instead of position: walking generations
 * from root inward, a generation's own registration replaces the inherited winner only
 * when it is shadow-flagged; a plain (non-shadow) registration at a deeper generation
 * never silently overrides what an ancestor already holds — the multiplicity guard
 * rejects that case instead. Two descriptors registered directly in the same
 * generation are a genuine duplicate either way, left to the guard to reject.
 * The one place this rule lives; the plan-compile path and the runtime resolve path
 * both read it from here.
 */
export const winnerOf = (bucket: readonly GraphNode[]): GraphNode | undefined => {
  if (!bucket.some((node) => node.shadow === true)) {
    return bucket[bucket.length - 1];
  }
  const groups = groupByDepth(bucket);
  const depths = [...groups.keys()].sort((a, b) => a - b);
  let winner: GraphNode | undefined;
  for (const depth of depths) {
    const group = groups.get(depth) as GraphNode[];
    const candidate = group[group.length - 1] as GraphNode;
    if (winner === undefined || candidate.shadow === true) {
      winner = candidate;
    }
  }
  return winner;
};

export const concreteNode = (index: OwnerIndex, token: ServiceIdentifier<SourceType>): GraphNode | undefined => {
  const bucket = index.get(token) ?? [];
  const winner = winnerOf(bucket);
  return winner === undefined ? undefined : followForward(index, winner);
};

/**
 * `rootRegistrations` is where everything beneath a singleton is looked up. Which
 * registration serves a token is decided here, at compile, so a scope's overlay would
 * otherwise be baked into a plan for an instance the whole provider shares.
 */
export const buildPlan = (
  graph: Graph,
  index: OwnerIndex,
  rootNode: GraphNode,
  lifetimeOf: (node: GraphNode) => Lifetime,
  isCached: (lifetime: Lifetime) => boolean,
  surfaceAt?: (token: ServiceIdentifier<SourceType>) => SurfaceReach | undefined,
  guardToken?: (token: ServiceIdentifier<SourceType>, nodes: readonly GraphNode[]) => unknown | undefined,
  rootRegistrations?: { readonly graph: Graph; readonly index: OwnerIndex },
): Plan => {
  const registrationsFor = (pass: number | undefined): { readonly graph: Graph; readonly index: OwnerIndex } => (pass === undefined ? { graph, index } : (rootRegistrations ?? { graph, index }));
  const steps: PlanStep[] = [];
  // Keyed by pass as well as node: the same cached node reached from two passes is two
  // instances, resolved against two different boundaries, so it cannot share one slot.
  const sharedSlot = new Map<number | undefined, Map<GraphNode, number>>();
  const slotsFor = (pass: number | undefined): Map<GraphNode, number> => {
    let slots = sharedSlot.get(pass);
    if (slots === undefined) {
      slots = new Map<GraphNode, number>();
      sharedSlot.set(pass, slots);
    }
    return slots;
  };
  // A singleton's pass belongs to the singleton, not to the place it was reached from:
  // reaching the same one twice must land on the same pass, or its slot memo cannot hit
  // and the plan carries a second copy of everything under it.
  const passOf = new Map<GraphNode, number>();
  let passes = 0;
  const passFor = (node: GraphNode): number => {
    let pass = passOf.get(node);
    if (pass === undefined) {
      pass = passes++;
      passOf.set(node, pass);
    }
    return pass;
  };

  const ownerOf = (node: GraphNode, pass: number | undefined): ServiceIdentifier<SourceType> => {
    const facts = registrationsFor(pass).graph.get(node) ?? graph.get(node);
    if (facts === undefined) {
      throw new Error(buildPlanMissingFacts);
    }
    return facts.owner;
  };

  const push = (step: PlanStep): number => {
    steps.push(step);
    return steps.length - 1;
  };

  const emitToken = (identifier: ServiceIdentifier<SourceType>, path: ReadonlySet<GraphNode>, pass: number | undefined): number => {
    const at = surfaceAt?.(identifier);
    if (at !== undefined) {
      return push({ kind: 'surface', token: identifier, at, pass });
    }
    const registrations = registrationsFor(pass);
    const guardError = guardToken?.(identifier, registrations.index.get(identifier) ?? []);
    if (guardError !== undefined) {
      return push({ kind: 'error', token: identifier, error: guardError });
    }
    const node = concreteNode(registrations.index, identifier);
    if (node === undefined) {
      return push({ kind: 'error', token: identifier, error: new UnregisteredServiceError(identifier) });
    }
    return emitNode(node, path, pass);
  };

  const emitNode = (node: GraphNode, path: ReadonlySet<GraphNode>, callerPass: number | undefined): number => {
    const lifetime = lifetimeOf(node);
    // Every singleton opens its own pass at the root, nested ones included: one
    // construction, one pass, shared by its subtree and nothing else.
    const pass = lifetime === Lifetime.Singleton ? passFor(node) : callerPass;
    const token = ownerOf(node, pass);
    const cached = isCached(lifetime);
    const slots = slotsFor(pass);
    const existing = slots.get(node);
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
      fields.push({ field, slot: emitToken(identifier, nextPath, pass) });
    }
    const args: number[] = [];
    for (const identifier of node.declaredDeps ?? []) {
      if (identifier === token) {
        args.push(push({ kind: 'error', token, error: new SelfDependencyError() }));
        continue;
      }
      args.push(emitToken(identifier, nextPath, pass));
    }
    const slot = push({ kind: 'build', node, token, lifetime, fields, args, pass });
    if (cached) {
      slots.set(node, slot);
    }
    return slot;
  };

  emitNode(rootNode, new Set(), undefined);
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
