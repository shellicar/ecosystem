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
 * Assembles the shared engine machinery over a registration map (decisions.md
 * §7/§8) — used by both {@link buildEngine} and {@link buildEngineAsync}, which
 * differ only in how singletons are pre-baked: synchronously, or awaiting async
 * (`usingAsync`) factories at the build boundary.
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
 * distinct instance. A singleton is lazy by default — constructed on first resolve
 * and memoised by its feature; `.eager()` opts one into construction at build, and
 * an async (`usingAsync`) singleton must bake at build since `resolve()` cannot
 * await (decisions.md §8). Those pre-baked singletons are constructed once here, in
 * topological order; one whose construction throws has that error *held* as its
 * resolution: lenient by default, thrown at build when `validate` is set.
 */
const setupEngine = (services: DescriptorMap, composition: EngineComposition, options: BuildEngineOptions) => {
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
      // Announce the construction to the seam the disposal tracker composes onto
      // (decisions.md §8), inert unless composed. Every constructed disposable is
      // announced, no lifetime exempt. A singleton belongs to the provider however it
      // was first reached — a lazy singleton constructed *through* a scope still dies at
      // provider dispose, not the scope's — so it is announced against the root boundary;
      // every other lifetime dies at the boundary that resolved it (scope-resolved at
      // scope dispose, root-resolved at provider dispose). "The pass never disposes"
      // means pass exit is not a disposal event — the caller holds the result — not that
      // resolve-lifetime is never tracked.
      disposal?.announce(instance, step.lifetime === Lifetime.Singleton ? rootBoundary : boundary);
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

  /**
   * The singletons pre-baked at build, deps-first (forwards excluded). Design (A):
   * a plain singleton is lazy — it falls through to the feature's own memoisation
   * on first resolve — so only `.eager()` (an explicit build-time choice) and an
   * async `usingAsync` singleton (which `resolve()` cannot await) bake here
   * (decisions.md §8). Eager on a non-singleton has no build-time boundary to hold
   * it, so nothing is pre-baked for it.
   */
  const prebakedNodes = (): GraphNode[] => topologicalOrder(graph).filter((node) => node.forwardTarget == null && effectiveLifetime(node) === Lifetime.Singleton && (node.eager === true || node.isAsync === true));

  /** Hold a failed pre-bake as that node's resolution — lenient by default, thrown at build under validate. */
  const hold = (node: GraphNode, outcome: Outcome): void => {
    if (!outcome.ok) {
      heldErrors.set(node, outcome.error);
    }
  };

  /**
   * Await one async singleton's factory (`usingAsync`) and seed the settled
   * instance into the singleton table, so a later synchronous resolve reads the
   * value and never the promise. Async is the build boundary only (decisions.md
   * §8): deps-first order means every singleton this one depends on is already
   * seeded, so the factory's synchronous `scope.resolve` calls return settled
   * instances. `resolve()` never awaits. The failure path mirrors `runStep`'s —
   * the factory's throw (or rejection) is wrapped as this token's creation error.
   */
  const constructAsyncSingleton = async (node: GraphNode): Promise<Outcome> => {
    const env = freshPass(rootBase);
    const token = graph.get(node)?.owner ?? (node.implementation as ServiceIdentifier<SourceType>);
    try {
      const value = await Promise.resolve(node.createInstance(inPassScope(env, rootBoundary)));
      const seeded = composition.singleton === undefined ? value : composition.singleton.getInstance(node, env, () => value);
      disposal?.announce(seeded, rootBoundary);
      return ok(seeded);
    } catch (err) {
      return failed(new ServiceCreationError(token, err instanceof Error ? err : undefined, node.implementation));
    }
  };

  /** Pre-bake every singleton synchronously by executing its plan (the sync build boundary). */
  const prebakeSync = (): void => {
    for (const node of prebakedNodes()) {
      // The sync build boundary refuses an async factory: only buildEngineAsync can
      // await its instance. A raw DescriptorMap can carry an isAsync node past the
      // type-level guard (hand-built descriptors), so this backstops it at build,
      // naming the token and pointing to the async builder (decisions.md §8).
      if (node.isAsync === true) {
        const token = graph.get(node)?.owner ?? (node.implementation as ServiceIdentifier<SourceType>);
        throw new Error(`Cannot build '${token.name}' synchronously: it is registered with an async factory (usingAsync). Use buildProviderAsync to build a provider with async registrations.`);
      }
      hold(node, execute(planFor(node), freshPass(rootBase), rootBoundary));
    }
  };

  /** Pre-bake deps-first, awaiting each async singleton's factory in turn (the async build boundary). */
  const prebakeAsync = async (): Promise<void> => {
    for (const node of prebakedNodes()) {
      hold(node, node.isAsync === true ? await constructAsyncSingleton(node) : execute(planFor(node), freshPass(rootBase), rootBoundary));
    }
  };

  /** Under `validate`, surface the first held singleton error at build rather than at first resolve. */
  const throwIfValidating = (): void => {
    if (options.validate === true && heldErrors.size > 0) {
      throw heldErrors.values().next().value;
    }
  };

  const assemble = (): Engine => {
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

  return { prebakeSync, prebakeAsync, throwIfValidating, assemble };
};

/**
 * Renders a registration map into a running engine, synchronously. Eager
 * (`.eager()`) singletons are pre-baked at build in topological order — a plain
 * singleton stays lazy until first resolve (decisions.md §8); one whose
 * construction throws has that error held as its resolution, lenient by default,
 * thrown here under `validate`. `resolve` executes a static plan and never
 * re-enters itself.
 */
export const buildEngine = (services: DescriptorMap, composition: EngineComposition, options: BuildEngineOptions = {}): Engine => {
  const engine = setupEngine(services, composition, options);
  engine.prebakeSync();
  engine.throwIfValidating();
  return engine.assemble();
};

/**
 * The async build boundary (decisions.md §8): the same engine as
 * {@link buildEngine}, but async singleton factories (`usingAsync`) are awaited
 * in topological order before the provider is returned, so their instances are
 * settled and every subsequent `resolve()` stays synchronous. Async is possible
 * here — where every v4 attempt failed — because definition-time edges separate
 * knowing the graph from constructing it. An async factory reachable through a
 * sync path (one not pre-baked as a singleton) is an `asyncThroughSyncPathPolicy`
 * problem for `validate()`, not a runtime check.
 */
export const buildEngineAsync = async (services: DescriptorMap<SourceType, boolean>, composition: EngineComposition, options: BuildEngineOptions = {}): Promise<Engine> => {
  // The phantom async brand exists only to steer the sync/async build choice at
  // the public boundary; setupEngine treats every map alike, so erase it here.
  const engine = setupEngine(services as DescriptorMap, composition, options);
  await engine.prebakeAsync();
  engine.throwIfValidating();
  return engine.assemble();
};
