import { CaptivePolicy, Lifetime, ValidationProblemKind } from '../enums';
import type { ValidationProblem } from '../types';
import { detectCycles, findUnregisteredEdges, type Graph, reachableFrom } from './graph';

/**
 * A composed diagnostic over the static graph — reads {@link Graph} facts,
 * decides what counts as a problem for this composition. `validate()` is
 * just: run the composed policy set (decisions.md §8). Lifetimes and graph
 * policies are orthogonal — a policy reads a node's declared lifetime as
 * opaque data; it never interprets or manages it.
 */
export type GraphPolicy = (graph: Graph) => ValidationProblem[];

/** A dependency cycle anywhere in the graph — one problem per distinct cycle. */
export const cyclePolicy: GraphPolicy = (graph) =>
  detectCycles(graph).map((cycle) => {
    const names = cycle.map((node) => graph.get(node)?.owner.name ?? '');
    return {
      kind: ValidationProblemKind.Cycle,
      message: `Dependency cycle: ${names.join(' -> ')} -> ${names[0]}`,
    };
  });

/** A declared out-edge (forward, factory, or @dependsOn) whose target has no registered node. */
export const missingTargetPolicy: GraphPolicy = (graph) =>
  findUnregisteredEdges(graph).map((edge) => ({
    kind: ValidationProblemKind.MissingTarget,
    message: `${graph.get(edge.from)?.owner.name} depends on ${edge.missing.name}, which is not registered`,
  }));

/**
 * Builds a captive-dependency policy from a predicate over a reachable dep's
 * lifetime. "Should a singleton only hold singletons?" is answered by which
 * predicate is composed, not by the lifetime features themselves (§8) — there
 * is no rank between the choices below, each is a different, equally valid
 * answer. A dep with an `undefined` lifetime is a forward (no lifetime of its
 * own — the walk already passes through it to its target) and is never itself
 * reported as captured.
 */
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
        if (depFacts?.lifetime != null && isCaptured(depFacts.lifetime)) {
          problems.push({
            kind: ValidationProblemKind.CaptiveDependency,
            message: `${facts.owner.name} (singleton) captures ${depFacts.owner.name} (${depFacts.lifetime}) in its dependency tree — a captive dependency`,
          });
        }
      }
    }
    return problems;
  };

/** A singleton may only reach singletons — flags any scoped or transient dep, anywhere in the tree. */
export const strictCaptive: GraphPolicy = captivePolicy((lifetime) => lifetime !== Lifetime.Singleton);

/** The MS-DI-style rule: flags only deps whose table is torn down before the singleton is — scope-owned deps. */
export const disposalCaptive: GraphPolicy = captivePolicy((lifetime) => lifetime === Lifetime.Scoped);

/**
 * An async factory (`usingAsync`) reachable through a synchronous path
 * (decisions.md §8). Async is the build boundary only: `buildProviderAsync`
 * awaits async *singleton* factories in topo order, so their instances are
 * settled before any synchronous `resolve()`. An async factory under any other
 * lifetime is constructed during a sync resolve, where its `Promise` cannot be
 * awaited — the graph knows this statically, before anything constructs. The
 * safe case is exactly `Lifetime.Singleton`; every other effective lifetime
 * (including the un-verbed default, which is never singleton) is a problem.
 */
export const asyncThroughSyncPathPolicy: GraphPolicy = (graph) => {
  const problems: ValidationProblem[] = [];
  for (const facts of graph.values()) {
    if (facts.isAsync && facts.lifetime !== Lifetime.Singleton) {
      problems.push({
        kind: ValidationProblemKind.AsyncThroughSyncPath,
        message: `${facts.owner.name} is an async factory resolving under ${facts.lifetime ?? 'the default lifetime'} — an async factory reachable through a synchronous path; register it as a singleton and build with buildProviderAsync`,
      });
    }
  }
  return problems;
};

/**
 * Maps each {@link CaptivePolicy} option to its graph policy. Total over the
 * enum, so a new enum member without an entry here is a compile error rather
 * than a silent fall-through.
 */
export const captivePolicyFor: Record<CaptivePolicy, GraphPolicy> = {
  [CaptivePolicy.Disposal]: disposalCaptive,
  [CaptivePolicy.Strict]: strictCaptive,
  [CaptivePolicy.None]: () => [],
};

/** Runs a composed set of graph policies and flattens their problems. */
export const runGraphPolicies = (graph: Graph, policies: readonly GraphPolicy[]): ValidationProblem[] => policies.flatMap((policy) => policy(graph));
