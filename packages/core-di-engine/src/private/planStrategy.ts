import { Lifetime } from '../enums';
import type { DescriptorMap, SourceType } from '../types';
import type { Boundary } from './boundaryEngine';
import { buildPlan, deriveFacts, formatGraph, type Plan, type PlanStep, topologicalOrder } from './graph';
import { type EngineView, failed, ok, type Outcome, type ResolutionStrategy, type StrategyKit } from './strategy';
import type { Env, Graph, GraphNode } from './types';

type PlanView = {
  readonly graph: Graph;
  readonly planCache: Map<GraphNode, Plan>;
};

/**
 * The plan strategy: compiles each root node into a flat, cached plan of steps
 * (dependencies as slots, errors and surfaces pre-resolved at compile time) and
 * executes it as a slot machine. Pays a compile once per node per view; every
 * later resolve replays the plan.
 */
export const createPlanStrategy =
  () =>
  (kit: StrategyKit): ResolutionStrategy => {
    const dataOf = (view: EngineView): PlanView => view.data as PlanView;

    const planFor = (view: EngineView, node: GraphNode): Plan => {
      const { graph, planCache } = dataOf(view);
      let plan = planCache.get(node);
      if (plan === undefined) {
        plan = buildPlan(graph, view.index, node, kit.effectiveLifetime, kit.isCached, kit.surfaceAt, kit.guardToken);
        planCache.set(node, plan);
      }
      return plan;
    };

    const runStep = (view: EngineView, step: PlanStep, locals: readonly Outcome[], env: Env, boundary: Boundary): Outcome => {
      if (step.kind === 'error') {
        return failed(step.error);
      }
      if (step.kind === 'surface') {
        return ok(kit.surfaceValue(step.at, boundary));
      }
      if (step.lifetime === Lifetime.Singleton) {
        const held = kit.heldErrorFor(step.node);
        if (held !== undefined) {
          return failed(held);
        }
      }
      for (const { slot } of step.fields) {
        const dependency = locals[slot];
        if (!dependency.ok) {
          return failed(kit.wrapForToken(dependency.error, step.token, step.node.implementation));
        }
      }
      for (const slot of step.args) {
        const dependency = locals[slot];
        if (!dependency.ok) {
          return failed(kit.wrapForToken(dependency.error, step.token, step.node.implementation));
        }
      }
      const build = (): unknown => {
        const args = step.node.createFromDeps === undefined ? undefined : step.args.map((slot) => (locals[slot] as { value: SourceType }).value);
        const fields = step.fields.map(({ field, slot }) => ({ field, value: (locals[slot] as { value: unknown }).value }));
        return kit.construct(view, step.node, step.token, step.lifetime, env, boundary, args, fields);
      };
      try {
        return ok(kit.cached(step.lifetime, step.node, env, build));
      } catch (err) {
        return failed(err);
      }
    };

    return {
      createView: (services: DescriptorMap): PlanView => ({ graph: deriveFacts(services), planCache: new Map() }),
      instanceFor: (view, node, env, boundary): Outcome => {
        const locals: Outcome[] = [];
        for (const step of planFor(view, node)) {
          locals.push(runStep(view, step, locals, env, boundary));
        }
        return locals[locals.length - 1];
      },
      prebakeCandidates: (view) => topologicalOrder(dataOf(view).graph),
      graphLines: (view) => formatGraph(dataOf(view).graph, kit.effectiveLifetime),
    };
  };
