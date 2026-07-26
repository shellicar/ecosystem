import { CaptivePolicy, Lifetime, ValidationProblemKind } from '../enums';
import type { ValidationProblem } from '../types';
import { detectCycles, findUnregisteredEdges, indexByOwner, reachableFrom, winnerOf } from './graph';
import { asyncThroughSyncPath, captiveDependency, dependencyCycle, dependencyCycleOverridden, missingTarget } from './messages';
import type { Graph, GraphPolicy } from './types';

export const cyclePolicy: GraphPolicy = (graph) => {
  const cycles = detectCycles(graph);
  if (cycles.length === 0) {
    return [];
  }
  // Whether a cycle is an error depends on which door the app uses, and that is
  // unknowable here: resolve() never walks a registration overridden by a later
  // duplicate, resolveAll() walks every registration in both modes. So the report
  // stays conservative and says which door an overridden cycle bites through,
  // letting a deliberate last-wins override be recognised for what it is.
  const index = indexByOwner(graph);
  const isOverridden = (node: (typeof cycles)[number][number]): boolean => {
    const facts = graph.get(node);
    return (facts?.owners ?? []).some((owner) => {
      const bucket = index.get(owner) ?? [];
      return bucket.length > 1 && winnerOf(bucket) !== node;
    });
  };
  return cycles.map((cycle) => {
    const names = cycle.map((node) => graph.get(node)?.owner.name ?? '');
    return {
      kind: ValidationProblemKind.Cycle,
      message: cycle.some(isOverridden) ? dependencyCycleOverridden(names) : dependencyCycle(names),
    };
  });
};

export const missingTargetPolicy: GraphPolicy = (graph) =>
  findUnregisteredEdges(graph).map((edge) => ({
    kind: ValidationProblemKind.MissingTarget,
    message: missingTarget(graph.get(edge.from)?.owner.name, edge.missing.name),
  }));

// Lifetimes arrive stamped: the composition supplies a concrete lifetime on every
// non-forward node before the graph is derived. Only a forward carries undefined
// here, and a forward is judged through its target node, not itself.
const captivePolicy =
  (isCaptured: (lifetime: Lifetime) => boolean): GraphPolicy =>
  (graph) => {
    const problems: ValidationProblem[] = [];
    for (const [node, facts] of graph) {
      if (facts.lifetime !== Lifetime.Singleton) {
        continue;
      }
      for (const dep of reachableFrom(graph, node)) {
        const depFacts = graph.get(dep);
        const lifetime = depFacts?.lifetime;
        if (lifetime != null && isCaptured(lifetime)) {
          problems.push({
            kind: ValidationProblemKind.CaptiveDependency,
            message: captiveDependency(facts.owner.name, depFacts?.owner.name, lifetime),
          });
        }
      }
    }
    return problems;
  };

export const strictCaptive: GraphPolicy = captivePolicy((lifetime) => lifetime !== Lifetime.Singleton);

export const disposalCaptive: GraphPolicy = captivePolicy((lifetime) => lifetime === Lifetime.Scoped);

export const asyncThroughSyncPathPolicy: GraphPolicy = (graph) => {
  const problems: ValidationProblem[] = [];
  for (const facts of graph.values()) {
    if (facts.isAsync && facts.lifetime !== Lifetime.Singleton) {
      problems.push({
        kind: ValidationProblemKind.AsyncThroughSyncPath,
        message: asyncThroughSyncPath(facts.owner.name, facts.lifetime),
      });
    }
  }
  return problems;
};

export const captivePolicyFor = (policy: CaptivePolicy): GraphPolicy => {
  switch (policy) {
    case CaptivePolicy.Disposal:
      return disposalCaptive;
    case CaptivePolicy.Strict:
      return strictCaptive;
    case CaptivePolicy.None:
      return () => [];
  }
};

export const runGraphPolicies = (graph: Graph, policies: readonly GraphPolicy[]): ValidationProblem[] => policies.flatMap((policy) => policy(graph));
