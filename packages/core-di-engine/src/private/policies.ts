import { CaptivePolicy, Lifetime, ValidationProblemKind } from '../enums';
import type { ValidationProblem } from '../types';
import { detectCycles, findUnregisteredEdges, indexByOwner, reachableFrom } from './graph';
import { asyncThroughSyncPath, captiveDependency, dependencyCycle, dependencyCycleShadowed, missingTarget } from './messages';
import type { Graph, GraphPolicy } from './types';

export const cyclePolicy: GraphPolicy = (graph) => {
  const cycles = detectCycles(graph);
  if (cycles.length === 0) {
    return [];
  }
  // Whether a cycle is an error depends on which door the app uses, and that is
  // unknowable here: resolve() never walks a shadowed registration, resolveAll()
  // walks every registration in both modes. So the report stays conservative
  // and SAYS which door a shadowed cycle bites through, letting a deliberate
  // last-wins override be recognised for what it is.
  const index = indexByOwner(graph);
  const isShadowed = (node: (typeof cycles)[number][number]): boolean => {
    const facts = graph.get(node);
    return (facts?.owners ?? []).some((owner) => {
      const bucket = index.get(owner) ?? [];
      return bucket.length > 1 && bucket[bucket.length - 1] !== node;
    });
  };
  return cycles.map((cycle) => {
    const names = cycle.map((node) => graph.get(node)?.owner.name ?? '');
    return {
      kind: ValidationProblemKind.Cycle,
      message: cycle.some(isShadowed) ? dependencyCycleShadowed(names) : dependencyCycle(names),
    };
  });
};

export const missingTargetPolicy: GraphPolicy = (graph) =>
  findUnregisteredEdges(graph).map((edge) => ({
    kind: ValidationProblemKind.MissingTarget,
    message: missingTarget(graph.get(edge.from)?.owner.name, edge.missing.name),
  }));

const captivePolicy =
  (defaultLifetime: Lifetime, isCaptured: (lifetime: Lifetime) => boolean): GraphPolicy =>
  (graph) => {
    const problems: ValidationProblem[] = [];
    for (const [node, facts] of graph) {
      if (facts.lifetime !== Lifetime.Singleton) {
        continue;
      }
      for (const dep of reachableFrom(graph, node)) {
        const depFacts = graph.get(dep);
        const effectiveLifetime = depFacts?.lifetime ?? (dep.forwardTarget != null ? undefined : defaultLifetime);
        if (effectiveLifetime != null && isCaptured(effectiveLifetime)) {
          problems.push({
            kind: ValidationProblemKind.CaptiveDependency,
            message: captiveDependency(facts.owner.name, depFacts?.owner.name, effectiveLifetime),
          });
        }
      }
    }
    return problems;
  };

export const strictCaptive = (defaultLifetime: Lifetime): GraphPolicy => captivePolicy(defaultLifetime, (lifetime) => lifetime !== Lifetime.Singleton);

export const disposalCaptive = (defaultLifetime: Lifetime): GraphPolicy => captivePolicy(defaultLifetime, (lifetime) => lifetime === Lifetime.Scoped);

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

export const captivePolicyFor = (policy: CaptivePolicy, defaultLifetime: Lifetime): GraphPolicy => {
  switch (policy) {
    case CaptivePolicy.Disposal:
      return disposalCaptive(defaultLifetime);
    case CaptivePolicy.Strict:
      return strictCaptive(defaultLifetime);
    case CaptivePolicy.None:
      return () => [];
  }
};

export const runGraphPolicies = (graph: Graph, policies: readonly GraphPolicy[]): ValidationProblem[] => policies.flatMap((policy) => policy(graph));
