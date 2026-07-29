import { CaptivePolicy, Lifetime, Severity, ValidationProblemKind } from '../enums';
import type { ServiceIdentifier, SourceType, ValidationProblem } from '../types';
import { detectCycles, findUnregisteredEdges, indexByOwner, reachableFrom, winnerOf } from './graph';
import { asyncThroughSyncPath, captiveDependency, dependencyCycle, dependencyCycleOverridden, missingTarget, scopeMismatchRootReachable, scopeMismatchSingleton, sharingMismatch } from './messages';
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
      severity: Severity.Error,
      message: cycle.some(isOverridden) ? dependencyCycleOverridden(names) : dependencyCycle(names),
    };
  });
};

// A token can be a dependency edge target without ever being registered: the
// engine binds surface tokens (IServiceProvider et al.) itself at build, outside
// the descriptor map deriveFacts walks. Those tokens are always satisfied, so a
// caller passes them in to keep validate() agreeing with what buildProvider can
// actually resolve.
export const missingTargetPolicyFor =
  (knownTargets: ReadonlySet<ServiceIdentifier<SourceType>>): GraphPolicy =>
  (graph) =>
    findUnregisteredEdges(graph)
      .filter((edge) => !knownTargets.has(edge.missing))
      .map((edge) => ({
        kind: ValidationProblemKind.MissingTarget,
        severity: Severity.Error,
        message: missingTarget(graph.get(edge.from)?.owner.name, edge.missing.name),
      }));

export const missingTargetPolicy: GraphPolicy = missingTargetPolicyFor(new Set());

/**
 * A token only a scope can serve, depended on by a consumer that has no scope to be
 * served from. `servedBy` is the one lifetime that always resolves inside a scope.
 *
 * A singleton is an error: one instance serves the whole provider, so no boundary can
 * ever give it a scope and it can never construct — the same shape as a missing target,
 * a guaranteed failure deferred to resolve. Any other lifetime is a warning: resolved
 * inside a scope it is served correctly, and only the root is wrong, which no static
 * read can tell apart.
 *
 * The token is never registered (the engine binds it), so `missingTargetPolicy` must
 * still treat it as known: this is not a missing target, it is one that cannot be
 * satisfied for this consumer.
 */
export const scopeMismatchPolicyFor =
  (token: ServiceIdentifier<SourceType>, servedBy: Lifetime): GraphPolicy =>
  (graph) => {
    const problems: ValidationProblem[] = [];
    for (const facts of graph.values()) {
      // A forward carries no lifetime of its own; its consumers are judged instead.
      if (facts.lifetime === undefined || facts.lifetime === servedBy || !facts.deps.includes(token)) {
        continue;
      }
      const neverServable = facts.lifetime === Lifetime.Singleton;
      problems.push({
        kind: ValidationProblemKind.ScopeMismatch,
        severity: neverServable ? Severity.Error : Severity.Warning,
        message: neverServable ? scopeMismatchSingleton(facts.owner.name, token.name) : scopeMismatchRootReachable(facts.owner.name, token.name, facts.lifetime),
      });
    }
    return problems;
  };

/**
 * A singleton may only hold what is shared at least as widely as itself, or not shared
 * at all: another singleton, a transient (nothing shares it, so no contract breaks), or
 * a provider-lived surface. A scoped or resolve dependency is shared with a set the
 * singleton cannot belong to, so it takes a private instance wearing a shared
 * contract — and which instance that is would depend on how it came to be built.
 *
 * A warning, and not governed by `CaptivePolicy`: every singleton resolves in a pass of
 * its own, so what it holds is deterministic and nothing misbehaves — the consumer
 * simply gets a private instance where it asked for a shared one. It sits beside the
 * captive report rather than replacing it, since a scoped dependency is both this and a
 * disposal hazard, and the hazard is what carries the severity.
 */
export const sharingMismatchPolicy: GraphPolicy = (graph) => {
  const problems: ValidationProblem[] = [];
  for (const [node, facts] of graph) {
    if (facts.lifetime !== Lifetime.Singleton) {
      continue;
    }
    for (const dep of reachableFrom(graph, node)) {
      const depFacts = graph.get(dep);
      const lifetime = depFacts?.lifetime;
      if (lifetime === Lifetime.Scoped || lifetime === Lifetime.Resolve) {
        problems.push({
          kind: ValidationProblemKind.SharingMismatch,
          severity: Severity.Warning,
          message: sharingMismatch(facts.owner.name, depFacts?.owner.name, lifetime),
        });
      }
    }
  }
  return problems;
};

// Lifetimes arrive stamped: the composition supplies a concrete lifetime on every
// non-forward node before the graph is derived. Only a forward carries undefined
// here, and a forward is judged through its target node, not itself.
const captivePolicy =
  (isCaptured: (lifetime: Lifetime) => boolean, severity: Severity): GraphPolicy =>
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
            severity,
            message: captiveDependency(facts.owner.name, depFacts?.owner.name, lifetime),
          });
        }
      }
    }
    return problems;
  };

// Strict errors: strictness a build ignores is not strict. Disposal warns: the
// scoped captive is a real use-after-dispose hazard, but the composition runs.
export const strictCaptive: GraphPolicy = captivePolicy((lifetime) => lifetime !== Lifetime.Singleton, Severity.Error);

export const disposalCaptive: GraphPolicy = captivePolicy((lifetime) => lifetime === Lifetime.Scoped, Severity.Warning);

export const asyncThroughSyncPathPolicy: GraphPolicy = (graph) => {
  const problems: ValidationProblem[] = [];
  for (const facts of graph.values()) {
    if (facts.isAsync && facts.lifetime !== Lifetime.Singleton) {
      problems.push({
        kind: ValidationProblemKind.AsyncThroughSyncPath,
        severity: Severity.Error,
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
