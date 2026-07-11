import { Lifetime } from '../enums';
import { CircularDependencyError, SelfDependencyError, ServiceCreationError, UnregisteredServiceError } from '../errors';
import type { IResolutionScope } from '../interfaces';
import type { DescriptorMap, ServiceDescriptor, ServiceIdentifier, ServiceRegistration, SourceType } from '../types';
import { DesignDependenciesKey } from './constants';
import { deriveFacts, type GraphNode, topologicalOrder } from './graph';
import type { Env, LifetimeFeature } from './lifetimeContracts';
import type { ScopedLifetime } from './lifetimeScoped';
import { getMetadata } from './metadata';

/**
 * The lifetime features an engine composes (decisions.md §8). Each is
 * self-contained: it brings its own storage and, where it has a boundary, the
 * handle that opens one. `Lifetime.Transient` is the floor — the absence of a
 * feature — so it has no entry here: a transient node has no table and is
 * constructed fresh at every dependency edge that names it.
 */
export type EngineComposition = {
  readonly singleton?: LifetimeFeature;
  readonly scoped?: ScopedLifetime;
  readonly resolve?: LifetimeFeature;
};

/**
 * Options for {@link buildEngine}. `validate` opts the build out of leniency:
 * if any singleton's resolution was held as an error, that error is thrown at
 * build rather than at the token's first resolve.
 */
export type BuildEngineOptions = {
  readonly validate?: boolean;
};

/** A resolution surface — the provider root, or a scope opened from it. */
export type Scope = {
  resolve<T extends SourceType>(token: ServiceIdentifier<T>): T;
  resolveAll<T extends SourceType>(token: ServiceIdentifier<T>): T[];
};

/** The built engine: the provider root plus the verb that opens a scope. */
export type Engine = Scope & {
  createScope(): Scope;
};

/**
 * One token's resolution, worked out once and held: the instance, or the error
 * that stands as that token's resolution (decisions.md §7). Plan execution
 * fills a slot with an `Outcome` rather than throwing, so a dependent can read
 * a failed dependency's error and wrap it, mirroring per-level nesting.
 */
type Outcome = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: unknown };

const ok = (value: unknown): Outcome => ({ ok: true, value });
const failed = (error: unknown): Outcome => ({ ok: false, error });

/**
 * One pre-computed step of a token's execution plan. A `build` step constructs
 * a node, wiring each `@dependsOn` field from an earlier slot in the same plan.
 * An `error` step is a fault determined statically at build (a cycle, a
 * self-dependency, an unregistered edge) and held to surface at execution.
 */
type PlanStep =
  | {
      readonly kind: 'build';
      readonly node: GraphNode;
      readonly token: ServiceIdentifier<SourceType>;
      readonly lifetime: Lifetime;
      readonly usesFactory: boolean;
      readonly fields: readonly { readonly field: string; readonly slot: number }[];
    }
  | {
      readonly kind: 'error';
      readonly token: ServiceIdentifier<SourceType>;
      readonly error: unknown;
    };

/**
 * A flat, deps-first plan: executing it top to bottom fills a `locals` table,
 * and the last slot is the requested token's resolution. Every edge and every
 * static fault is already decided here; execution only looks up and constructs.
 */
type Plan = readonly PlanStep[];

/**
 * Renders a registration map into a running engine (decisions.md §7/§8).
 *
 * The graph is derived once, and every token's execution is compiled into a
 * static {@link Plan} at build — dependency edges and faults (cycles,
 * self-dependencies, unregistered edges) are resolved here, from
 * definition-time `@dependsOn` metadata, with zero construction. `resolve` then
 * executes a plan by a flat, deps-first pass over a `locals` table: it reads
 * edges the plan already decided and never re-enters itself. The one sanctioned
 * exception is an opaque factory, whose body calls `scope.resolve` to join the
 * current pass (so a shared `Resolve`-lifetime dependency is one instance across
 * the factory and a sibling `@dependsOn` field).
 *
 * A cached lifetime (singleton, scoped, resolve) is one slot in the plan, shared
 * across its injection points and memoised by its feature; transient — the floor,
 * no feature — is a fresh slot per injection edge, so each injection point gets a
 * distinct instance. Singletons are constructed once here, in topological order;
 * a singleton whose construction throws has that error *held* as its resolution:
 * lenient by default, thrown at build when `validate` is set.
 */
export const buildEngine = (services: DescriptorMap, composition: EngineComposition, options: BuildEngineOptions = {}): Engine => {
  const graph = deriveFacts(services);
  /** A singleton whose build threw: its error, replayed as its resolution. */
  const heldErrors = new Map<GraphNode, unknown>();
  /** Each node's compiled plan, worked out once and reused across resolves. */
  const planCache = new Map<GraphNode, Plan>();

  const featureFor = (lifetime: Lifetime): LifetimeFeature | undefined => {
    switch (lifetime) {
      case Lifetime.Singleton:
        return composition.singleton;
      case Lifetime.Scoped:
        return composition.scoped?.feature;
      case Lifetime.Resolve:
        return composition.resolve;
      default:
        return undefined;
    }
  };

  /** Features that mint a fresh handle at each top-level resolve (resolve-lifetime). */
  const contributors = [composition.resolve].filter((feature): feature is LifetimeFeature => feature?.contribute != null);

  const descriptorsFor = (token: ServiceIdentifier<SourceType>): ServiceDescriptor<SourceType>[] => services.get(token) ?? [];

  const ownerOf = (node: GraphNode): ServiceIdentifier<SourceType> => graph.get(node)?.owner ?? (node.implementation as ServiceIdentifier<SourceType>);

  /** Follow a forward chain to the concrete node it redirects to (guarding a forward loop). */
  const followForward = (descriptor: ServiceDescriptor<SourceType>): GraphNode | undefined => {
    let node: ServiceDescriptor<SourceType> | undefined = descriptor;
    const seen = new Set<ServiceDescriptor<SourceType>>();
    while (node?.forwardTarget != null) {
      if (seen.has(node)) {
        return undefined;
      }
      seen.add(node);
      const bucket = descriptorsFor(node.forwardTarget);
      node = bucket[bucket.length - 1];
    }
    return node;
  };

  /** The concrete node a single `resolve(token)` lands on — the last registration, forwards followed. */
  const concreteNode = (token: ServiceIdentifier<SourceType>): GraphNode | undefined => {
    const bucket = descriptorsFor(token);
    const last = bucket[bucket.length - 1];
    return last === undefined ? undefined : followForward(last);
  };

  /**
   * Compiles the flat plan that resolves `rootNode`. Field edges are read from
   * definition-time metadata; a cached-lifetime dependency is emitted once and
   * its slot shared, a transient once per edge. A dependency already on the
   * compile path is a cycle, a field naming its own owner is a self-dependency,
   * an edge with no registered node is unregistered — each held as an error step.
   */
  const compilePlan = (rootNode: GraphNode): Plan => {
    const steps: PlanStep[] = [];
    const sharedSlot = new Map<GraphNode, number>();

    const push = (step: PlanStep): number => {
      steps.push(step);
      return steps.length - 1;
    };

    const emitToken = (identifier: ServiceIdentifier<SourceType>, path: ReadonlySet<GraphNode>): number => {
      const node = concreteNode(identifier);
      if (node === undefined) {
        return push({ kind: 'error', token: identifier, error: new UnregisteredServiceError(identifier) });
      }
      return emitNode(node, path);
    };

    const emitNode = (node: GraphNode, path: ReadonlySet<GraphNode>): number => {
      const token = ownerOf(node);
      const cached = featureFor(node.lifetime) !== undefined;
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
      const slot = push({ kind: 'build', node, token, lifetime: node.lifetime, usesFactory: node.usesFactory === true, fields });
      if (cached) {
        sharedSlot.set(node, slot);
      }
      return slot;
    };

    emitNode(rootNode, new Set());
    return steps;
  };

  const planFor = (node: GraphNode): Plan => {
    let plan = planCache.get(node);
    if (plan === undefined) {
      plan = compilePlan(node);
      planCache.set(node, plan);
    }
    return plan;
  };

  /** The in-pass surface handed to an opaque factory: its `resolve` re-joins the current pass. */
  const inPassScope = (env: Env): IResolutionScope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(token, env) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(token, env) as T[],
  });

  /** Re-wraps a below-the-line failure as this token's own creation error, mirroring per-level nesting. */
  const wrapForToken = (error: unknown, token: ServiceIdentifier<SourceType>, implementation: ServiceRegistration<SourceType>): unknown => {
    if (error instanceof ServiceCreationError && error.identifier !== token) {
      return new ServiceCreationError(token, error, implementation);
    }
    return error;
  };

  const runStep = (step: PlanStep, locals: readonly Outcome[], env: Env): Outcome => {
    if (step.kind === 'error') {
      return failed(step.error);
    }
    if (step.lifetime === Lifetime.Singleton && heldErrors.has(step.node)) {
      return failed(heldErrors.get(step.node));
    }
    for (const { slot } of step.fields) {
      const dependency = locals[slot];
      if (!dependency.ok) {
        return failed(wrapForToken(dependency.error, step.token, step.node.implementation));
      }
    }
    const build = (): unknown => {
      let instance: object;
      try {
        instance = step.node.createInstance(inPassScope(env)) as object;
      } catch (err) {
        throw new ServiceCreationError(step.token, err instanceof Error ? err : undefined, step.node.implementation);
      }
      for (const { field, slot } of step.fields) {
        (instance as Record<string, unknown>)[field] = (locals[slot] as { value: unknown }).value;
      }
      return instance;
    };
    try {
      const feature = featureFor(step.lifetime);
      return ok(feature === undefined ? build() : feature.getInstance(step.node, env, build));
    } catch (err) {
      return failed(err);
    }
  };

  const execute = (plan: Plan, env: Env): Outcome => {
    const locals: Outcome[] = [];
    for (const step of plan) {
      locals.push(runStep(step, locals, env));
    }
    return locals[locals.length - 1];
  };

  const resolveValue = (token: ServiceIdentifier<SourceType>, env: Env): unknown => {
    const node = concreteNode(token);
    if (node === undefined) {
      throw new UnregisteredServiceError(token);
    }
    const outcome = execute(planFor(node), env);
    if (!outcome.ok) {
      throw outcome.error;
    }
    return outcome.value;
  };

  const resolveManyValue = (token: ServiceIdentifier<SourceType>, env: Env): unknown[] => {
    const descriptors = descriptorsFor(token);
    if (descriptors.length === 0) {
      throw new UnregisteredServiceError(token);
    }
    return descriptors.map((descriptor) => {
      const node = followForward(descriptor);
      if (node === undefined) {
        throw new UnregisteredServiceError(token);
      }
      const outcome = execute(planFor(node), env);
      if (!outcome.ok) {
        throw outcome.error;
      }
      return outcome.value;
    });
  };

  const freshPass = (base: Env): Env => contributors.reduce((env, feature) => feature.contribute?.(env) ?? env, base);

  const scopeSurface = (base: Env): Scope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(token, freshPass(base)) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(token, freshPass(base)) as T[],
  });

  const rootBase: Env = composition.scoped?.beginScope() ?? {};

  // Pre-bake singletons deps-first: each is worked out once by executing its
  // plan, its instance memoised in the feature's table, or its error held as
  // that node's resolution (lenient by default; thrown at build under validate).
  for (const node of topologicalOrder(graph)) {
    if (node.forwardTarget != null || node.lifetime !== Lifetime.Singleton) {
      continue;
    }
    const outcome = execute(planFor(node), freshPass(rootBase));
    if (!outcome.ok) {
      heldErrors.set(node, outcome.error);
    }
  }

  if (options.validate === true && heldErrors.size > 0) {
    throw heldErrors.values().next().value;
  }

  const root = scopeSurface(rootBase);

  const createScope = (): Scope => {
    if (composition.scoped === undefined) {
      throw new Error('createScope requires a scoped lifetime to be composed');
    }
    return scopeSurface(composition.scoped.beginScope());
  };

  return {
    resolve: root.resolve,
    resolveAll: root.resolveAll,
    createScope,
  };
};
