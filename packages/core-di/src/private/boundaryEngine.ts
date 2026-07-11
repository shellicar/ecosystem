import { Lifetime } from '../enums';
import { ServiceCreationError, UnregisteredServiceError } from '../errors';
import type { IResolutionScope } from '../interfaces';
import type { DescriptorMap, ServiceDescriptor, ServiceIdentifier, ServiceRegistration, SourceType } from '../types';
import { buildPlan, concreteNode, deriveFacts, followForward, type GraphNode, indexByOwner, type Plan, type PlanStep, topologicalOrder } from './graph';
import type { Env, LifetimeFeature } from './lifetimeContracts';
import type { ScopedLifetime } from './lifetimeScoped';

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
  /**
   * The lifetime an un-verbed registration resolves under (decisions.md §8; the
   * SC-confirmed value is `Lifetime.Resolve`). A registration that names no
   * lifetime verb carries none on its descriptor; the engine — not the register
   * layer — owns the default, resolving such a node here. Defaults to
   * `Lifetime.Resolve` when the composition omits it.
   */
  readonly defaultLifetime?: Lifetime;
  /** The disposal seam (decisions.md §8). Inert when absent — see {@link DisposalSink}. */
  readonly disposal?: DisposalSink;
};

/** A resolution boundary — the root, or a scope — that constructions are announced to and that has an end. */
export type Boundary = { readonly id: symbol };

/**
 * The seam disposal composes onto (decisions.md §8). The engine announces every
 * construction with the boundary that resolved it, and ends a boundary when its
 * surface is disposed. Phase 13 exposes the call sites; the tracker itself — the
 * `Map<boundary, disposables>` and the nearest-boundary rule — is Phase 14. When
 * no sink is composed the announce/end calls are inert no-ops.
 */
export type DisposalSink = {
  announce(instance: unknown, boundary: Boundary): void;
  end(boundary: Boundary): void;
  /** Async teardown for a boundary (`await using` / `disposeAsync`). Optional — a sync-only sink omits it. */
  endAsync?(boundary: Boundary): Promise<void>;
};

/**
 * Options for {@link buildEngine}. `validate` opts the build out of leniency:
 * if any singleton's resolution was held as an error, that error is thrown at
 * build rather than at the token's first resolve.
 */
export type BuildEngineOptions = {
  readonly validate?: boolean;
};

/**
 * A resolution surface — the provider root, or a scope opened from it. A surface
 * is a disposal boundary: disposing it ends that boundary (decisions.md §8), the
 * seam Phase 14's tracker composes onto.
 */
export type Scope = {
  resolve<T extends SourceType>(token: ServiceIdentifier<T>): T;
  resolveAll<T extends SourceType>(token: ServiceIdentifier<T>): T[];
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): Promise<void>;
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
  const index = indexByOwner(graph);
  /** A singleton whose build threw: its error, replayed as its resolution. */
  const heldErrors = new Map<GraphNode, unknown>();
  /** Each node's compiled plan, worked out once and reused across resolves. */
  const planCache = new Map<GraphNode, Plan>();
  /** The lifetime an un-verbed registration resolves under — the engine owns the default (decisions.md §8). */
  const defaultLifetime = composition.defaultLifetime ?? Lifetime.Resolve;
  /** The disposal seam (Phase 14 supplies the tracker); inert here. */
  const disposal = composition.disposal;
  /** The root's own boundary — every root-resolved construction is announced against it. */
  const rootBoundary: Boundary = { id: Symbol('root') };

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

  /** Whether a lifetime is cached (a feature memoises it) — transient is the floor, not cached. */
  const isCached = (lifetime: Lifetime): boolean => featureFor(lifetime) !== undefined;

  /** A node's effective lifetime — its own explicit choice, or the engine default when un-verbed. */
  const effectiveLifetime = (node: GraphNode): Lifetime => node.lifetime ?? defaultLifetime;

  /** Features that mint a fresh handle at each top-level resolve (resolve-lifetime). */
  const contributors = [composition.resolve].filter((feature): feature is LifetimeFeature => feature?.contribute != null);

  const descriptorsFor = (token: ServiceIdentifier<SourceType>): ServiceDescriptor<SourceType>[] => services.get(token) ?? [];

  const planFor = (node: GraphNode): Plan => {
    let plan = planCache.get(node);
    if (plan === undefined) {
      plan = buildPlan(graph, index, node, effectiveLifetime, isCached);
      planCache.set(node, plan);
    }
    return plan;
  };

  /** The in-pass surface handed to an opaque factory: its `resolve` re-joins the current pass and boundary. */
  const inPassScope = (env: Env, boundary: Boundary): IResolutionScope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(token, env, boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(token, env, boundary) as T[],
  });

  /** Re-wraps a below-the-line failure as this token's own creation error, mirroring per-level nesting. */
  const wrapForToken = (error: unknown, token: ServiceIdentifier<SourceType>, implementation: ServiceRegistration<SourceType>): unknown => {
    if (error instanceof ServiceCreationError && error.identifier !== token) {
      return new ServiceCreationError(token, error, implementation);
    }
    return error;
  };

  const runStep = (step: PlanStep, locals: readonly Outcome[], env: Env, boundary: Boundary): Outcome => {
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
        instance = step.node.createInstance(inPassScope(env, boundary)) as object;
      } catch (err) {
        throw new ServiceCreationError(step.token, err instanceof Error ? err : undefined, step.node.implementation);
      }
      for (const { field, slot } of step.fields) {
        (instance as Record<string, unknown>)[field] = (locals[slot] as { value: unknown }).value;
      }
      // Announce the construction against the boundary that resolved it — the seam
      // the disposal tracker composes onto (decisions.md §8), inert unless composed.
      // Every constructed disposable is announced, no lifetime exempt: it dies at its
      // resolving boundary's end (root-resolved at provider dispose, scope-resolved at
      // scope dispose). "The pass never disposes" means pass exit is not a disposal
      // event — the caller holds the result — not that resolve-lifetime is never tracked.
      disposal?.announce(instance, boundary);
      return instance;
    };
    try {
      const feature = featureFor(step.lifetime);
      return ok(feature === undefined ? build() : feature.getInstance(step.node, env, build));
    } catch (err) {
      return failed(err);
    }
  };

  const execute = (plan: Plan, env: Env, boundary: Boundary): Outcome => {
    const locals: Outcome[] = [];
    for (const step of plan) {
      locals.push(runStep(step, locals, env, boundary));
    }
    return locals[locals.length - 1];
  };

  const resolveValue = (token: ServiceIdentifier<SourceType>, env: Env, boundary: Boundary): unknown => {
    const node = concreteNode(index, token);
    if (node === undefined) {
      throw new UnregisteredServiceError(token);
    }
    const outcome = execute(planFor(node), env, boundary);
    if (!outcome.ok) {
      throw outcome.error;
    }
    return outcome.value;
  };

  const resolveManyValue = (token: ServiceIdentifier<SourceType>, env: Env, boundary: Boundary): unknown[] => {
    const descriptors = descriptorsFor(token);
    if (descriptors.length === 0) {
      throw new UnregisteredServiceError(token);
    }
    return descriptors.map((descriptor) => {
      const node = followForward(index, descriptor);
      if (node === undefined) {
        throw new UnregisteredServiceError(token);
      }
      const outcome = execute(planFor(node), env, boundary);
      if (!outcome.ok) {
        throw outcome.error;
      }
      return outcome.value;
    });
  };

  const freshPass = (base: Env): Env => contributors.reduce((env, feature) => feature.contribute?.(env) ?? env, base);

  /** A resolution surface bound to one boundary: its resolves announce there, and disposing it ends that boundary. */
  const scopeSurface = (base: Env, boundary: Boundary): Scope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(token, freshPass(base), boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(token, freshPass(base), boundary) as T[],
    [Symbol.dispose]: (): void => disposal?.end(boundary),
    [Symbol.asyncDispose]: async (): Promise<void> => {
      await disposal?.endAsync?.(boundary);
    },
  });

  const rootBase: Env = composition.scoped?.beginScope() ?? {};

  // Pre-bake singletons deps-first: each is worked out once by executing its
  // plan, its instance memoised in the feature's table, or its error held as
  // that node's resolution (lenient by default; thrown at build under validate).
  for (const node of topologicalOrder(graph)) {
    if (node.forwardTarget != null || effectiveLifetime(node) !== Lifetime.Singleton) {
      continue;
    }
    const outcome = execute(planFor(node), freshPass(rootBase), rootBoundary);
    if (!outcome.ok) {
      heldErrors.set(node, outcome.error);
    }
  }

  if (options.validate === true && heldErrors.size > 0) {
    throw heldErrors.values().next().value;
  }

  const root = scopeSurface(rootBase, rootBoundary);

  const createScope = (): Scope => {
    if (composition.scoped === undefined) {
      throw new Error('createScope requires a scoped lifetime to be composed');
    }
    // A scope is its own boundary — constructions it resolves are announced there
    // and end when it is disposed. That per-boundary filing is the nearest-boundary
    // rule: a scope-resolved transient files under the scope, a root-resolved one
    // under the root (decisions.md §8; the tracker is {@link DisposalSink}).
    return scopeSurface(composition.scoped.beginScope(), { id: Symbol('scope') });
  };

  return {
    resolve: root.resolve,
    resolveAll: root.resolveAll,
    createScope,
    [Symbol.dispose]: root[Symbol.dispose],
    [Symbol.asyncDispose]: root[Symbol.asyncDispose],
  };
};
