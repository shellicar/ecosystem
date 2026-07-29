import { Lifetime } from '../enums';
import type { DescriptorMap, SourceType } from '../types';
import type { Boundary } from './boundaryEngine';
import { buildPlan, deriveFacts, formatGraph, type Plan, type PlanStep, topologicalOrder } from './graph';
import { type EngineView, failed, type Outcome, ok, type ResolutionStrategy, type StrategyKit } from './strategy';
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
        const root = kit.rootView();
        plan = buildPlan(graph, view.index, node, kit.lifetimeOf, kit.isCached, kit.surfaceAt, kit.guardToken, { graph: dataOf(root).graph, index: root.index });
        planCache.set(node, plan);
      }
      return plan;
    };

    const runStep = (view: EngineView, step: PlanStep, locals: readonly Outcome[], env: Env, boundary: Boundary): Outcome => {
      if (step.kind === 'error') {
        return failed(step.error);
      }
      // A surface can refuse the boundary it is asked at, and every failure in a plan
      // travels as a failed slot rather than a throw: a prebaked node holds its failure
      // for its first resolve, which a throw escaping here would skip.
      //
      // Resolved at replay, never at compile: one plan is replayed at every boundary,
      // so which surface serves it is not knowable when the plan is built.
      if (step.kind === 'surface') {
        try {
          return ok(kit.surfaceValue(step.at, boundary, step.token));
        } catch (err) {
          return failed(err);
        }
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
        // One pass per singleton, made when its first step runs: a singleton is one
        // construction, so its subtree shares a pass with it and with nothing else.
        const roots = new Map<number, { readonly env: Env; readonly boundary: Boundary; readonly view: EngineView }>();
        const passFor = (step: PlanStep): { readonly env: Env; readonly boundary: Boundary; readonly view: EngineView } => {
          if (step.kind === 'error' || step.pass === undefined) {
            return { env, boundary, view };
          }
          let root = roots.get(step.pass);
          if (root === undefined) {
            root = { ...kit.rootPass(), view: kit.rootView() };
            roots.set(step.pass, root);
          }
          return root;
        };
        for (const step of planFor(view, node)) {
          const pass = passFor(step);
          locals.push(runStep(pass.view, step, locals, pass.env, pass.boundary));
        }
        return locals[locals.length - 1];
      },
      prebakeCandidates: (view) => topologicalOrder(dataOf(view).graph),
      graphLines: (view) => formatGraph(dataOf(view).graph, kit.lifetimeOf),
    };
  };
