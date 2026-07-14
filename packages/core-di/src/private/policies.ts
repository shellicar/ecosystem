import { CaptivePolicy, Lifetime, ValidationProblemKind } from '../enums';
import type { ValidationProblem } from '../types';
import { detectCycles, findUnregisteredEdges, type Graph, reachableFrom } from './graph';

export type GraphPolicy = (graph: Graph) => ValidationProblem[];

export const cyclePolicy: GraphPolicy = (graph) =>
  detectCycles(graph).map((cycle) => {
    const names = cycle.map((node) => graph.get(node)?.owner.name ?? '');
    return {
      kind: ValidationProblemKind.Cycle,
      message: `Dependency cycle: ${names.join(' -> ')} -> ${names[0]}`,
    };
  });

export const missingTargetPolicy: GraphPolicy = (graph) =>
  findUnregisteredEdges(graph).map((edge) => ({
    kind: ValidationProblemKind.MissingTarget,
    message: `${graph.get(edge.from)?.owner.name} depends on ${edge.missing.name}, which is not registered`,
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
            message: `${facts.owner.name} (singleton) captures ${depFacts?.owner.name} (${effectiveLifetime}) in its dependency tree, a captive dependency`,
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
        message: `${facts.owner.name} is an async factory resolving under ${facts.lifetime ?? 'the default lifetime'}, an async factory reachable through a synchronous path; register it as a singleton and build with buildProviderAsync`,
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
