import { Lifetime, ResolveMultipleMode } from '../enums';
import { MultipleRegistrationError, ServiceCreationError, UnregisteredServiceError } from '../errors';
import type { IResolutionScope } from '../interfaces';
import type { AsyncInstanceFactory, DescriptorMap, ServiceDescriptor, ServiceIdentifier, ServiceRegistration, SourceType } from '../types';
import { buildPlan, concreteNode, deriveFacts, followForward, type Graph, type GraphNode, indexByOwner, type OwnerIndex, type Plan, type PlanStep, topologicalOrder } from './graph';
import type { Env, LifetimeFeature } from './lifetimeContracts';
import type { ScopedLifetime } from './lifetimeScoped';

/** A node whose instance comes from an async factory (`usingAsync`) — its own field, physically apart from the sync `createInstance` (decisions.md §8). */
type AsyncNode = GraphNode & { createInstanceAsync: AsyncInstanceFactory<SourceType> };

/**
 * Whether a node is async — *derived* from the presence of its async factory
 * field, never a hand-set flag (decisions.md §8). The narrowing return type lets
 * the async build path read `createInstanceAsync` without a cast: the sync path
 * reads only `createInstance`, so an async factory is structurally unreachable there.
 */
const isAsyncNode = (node: GraphNode): node is AsyncNode => node.createInstanceAsync != null;

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
  /**
   * The self-tokens (decisions.md §7): tokens that resolve to a resolution
   * *surface* rather than a registration — `IServiceProvider` to the root's
   * bound surface, `IResolutionScope`/`IScopedProvider` to the surface of the
   * boundary doing the resolving, never to the in-pass scope (an in-pass
   * surface would pin pass handles alive and share stale `Resolve` instances;
   * a later call through an injected surface must be a fresh pass). The
   * surface value itself is bound by the public wrapper via
   * {@link Scope.bindSurface}; a surface is never constructed by the engine
   * and never announced to disposal.
   */
  readonly surfaceTokens?: ReadonlyMap<ServiceIdentifier<SourceType>, 'root' | 'boundary'>;
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
 * build rather than at the token's first resolve. `registrationMode` decides
 * what a single `resolve` does when a token carries several registrations:
 * throw {@link MultipleRegistrationError} (the default), or resolve the last
 * registered.
 */
export type BuildEngineOptions = {
  readonly validate?: boolean;
  readonly registrationMode?: ResolveMultipleMode;
};

/**
 * A resolution surface — the provider root, or a scope opened from it. A surface
 * is a disposal boundary: disposing it ends that boundary (decisions.md §8), the
 * seam Phase 14's tracker composes onto. `bindSurface` names the value the
 * boundary's surface tokens resolve to — the public wrapper binds itself here,
 * so an injected `IScopedProvider` is the wrapper, not the engine internals.
 */
export type Scope = {
  resolve<T extends SourceType>(token: ServiceIdentifier<T>): T;
  resolveAll<T extends SourceType>(token: ServiceIdentifier<T>): T[];
  bindSurface(surface: unknown): void;
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): Promise<void>;
};

/**
 * A live overlay a scope resolves through: the scope's own registrations
 * (dynamic scope registration, decisions.md §7). Definition-time edges mean a
 * dynamically registered service's plan is derivable at registration with no
 * construction — the engine derives a per-scope view over this map, and
 * `version` tells it when a new registration made that view stale.
 */
export type ScopeOverlay = () => { readonly services: DescriptorMap; readonly version: number };

/** The built engine: the provider root plus the verb that opens a scope. */
export type Engine = Scope & {
  createScope(overlay?: ScopeOverlay): Scope;
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
 * One registration map's derived statics: the graph, the owner index, and the
 * compiled plans. The root has one view, built once; a scope with dynamic
 * registrations has its own, derived over the scope's map (which shares the
 * root's descriptor objects, so every cache and held error keyed on a node
 * still applies) and rebuilt when a registration lands.
 */
type View = {
  readonly services: DescriptorMap;
  readonly graph: Graph;
  readonly index: OwnerIndex;
  readonly planCache: Map<GraphNode, Plan>;
};

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
  /** A singleton whose build threw: its error, replayed as its resolution. Keyed on the node, so it holds across every view. */
  const heldErrors = new Map<GraphNode, unknown>();
  /** The lifetime an un-verbed registration resolves under — the engine owns the default (decisions.md §8). */
  const defaultLifetime = composition.defaultLifetime ?? Lifetime.Resolve;
  /** The disposal seam (Phase 14 supplies the tracker); inert here. */
  const disposal = composition.disposal;
  /** The root's own boundary — every root-resolved construction is announced against it. */
  const rootBoundary: Boundary = { id: Symbol('root') };
  /** Each boundary's bound surface — what its surface tokens resolve to (see {@link EngineComposition.surfaceTokens}). */
  const surfaces = new Map<symbol, unknown>();

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

  /** Which boundary's surface a token resolves to, when it is a surface token at all. */
  const surfaceAt = (token: ServiceIdentifier<SourceType>): 'root' | 'boundary' | undefined => composition.surfaceTokens?.get(token);

  /**
   * The registrationMode policy over a token's registrations: a single resolve
   * of a token carrying several is an error unless the composition chose
   * last-registered (decisions.md §7; the engine default matches the public
   * default, `ResolveMultipleMode.Error`).
   */
  const guardToken = (token: ServiceIdentifier<SourceType>, nodes: readonly GraphNode[]): unknown | undefined => {
    if (nodes.length > 1 && (options.registrationMode ?? ResolveMultipleMode.Error) === ResolveMultipleMode.Error) {
      return new MultipleRegistrationError(token);
    }
    return undefined;
  };

  /** Features that mint a fresh handle at each top-level resolve (resolve-lifetime). */
  const contributors = [composition.resolve].filter((feature): feature is LifetimeFeature => feature?.contribute != null);

  const makeView = (viewServices: DescriptorMap): View => {
    // The owner index is the services map itself — token to descriptors, every
    // face included. Deriving it from the graph would lose faces: the graph
    // holds ONE facts entry per node, so a node registered under several tokens
    // (multiple `.as()` on one register call) keeps only its last owner there.
    const graph = deriveFacts(viewServices);
    return { services: viewServices, graph, index: viewServices, planCache: new Map() };
  };

  /** The root's view — derived once at build, the static structure every resolve executes against. */
  const rootView = makeView(services);

  const planFor = (view: View, node: GraphNode): Plan => {
    let plan = view.planCache.get(node);
    if (plan === undefined) {
      plan = buildPlan(view.graph, view.index, node, effectiveLifetime, isCached, surfaceAt, guardToken);
      view.planCache.set(node, plan);
    }
    return plan;
  };

  /** The in-pass surface handed to an opaque factory: its `resolve` re-joins the current pass and boundary. */
  const inPassScope = (view: View, env: Env, boundary: Boundary): IResolutionScope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(view, token, env, boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(view, token, env, boundary) as T[],
  });

  /** Re-wraps a below-the-line failure as this token's own creation error, mirroring per-level nesting. */
  const wrapForToken = (error: unknown, token: ServiceIdentifier<SourceType>, implementation: ServiceRegistration<SourceType>): unknown => {
    if (error instanceof ServiceCreationError && error.identifier !== token) {
      return new ServiceCreationError(token, error, implementation);
    }
    return error;
  };

  const runStep = (view: View, step: PlanStep, locals: readonly Outcome[], env: Env, boundary: Boundary): Outcome => {
    if (step.kind === 'error') {
      return failed(step.error);
    }
    if (step.kind === 'surface') {
      // A surface token resolves to the bound surface of its boundary — the root's
      // for IServiceProvider, the resolving boundary's for the scope tokens. Never
      // constructed, never announced: a surface is not an instance the boundary owns.
      return ok(surfaces.get(step.at === 'root' ? rootBoundary.id : boundary.id));
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
        instance = step.node.createInstance(inPassScope(view, env, boundary)) as object;
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

  const execute = (view: View, plan: Plan, env: Env, boundary: Boundary): Outcome => {
    const locals: Outcome[] = [];
    for (const step of plan) {
      locals.push(runStep(view, step, locals, env, boundary));
    }
    return locals[locals.length - 1];
  };

  const resolveValue = (view: View, token: ServiceIdentifier<SourceType>, env: Env, boundary: Boundary): unknown => {
    const at = surfaceAt(token);
    if (at !== undefined) {
      return surfaces.get(at === 'root' ? rootBoundary.id : boundary.id);
    }
    const guardError = guardToken(token, view.index.get(token) ?? []);
    if (guardError !== undefined) {
      throw guardError;
    }
    const node = concreteNode(view.index, token);
    if (node === undefined) {
      throw new UnregisteredServiceError(token);
    }
    const outcome = execute(view, planFor(view, node), env, boundary);
    if (!outcome.ok) {
      throw outcome.error;
    }
    return outcome.value;
  };

  const resolveManyValue = (view: View, token: ServiceIdentifier<SourceType>, env: Env, boundary: Boundary): unknown[] => {
    const descriptors = view.services.get(token) ?? [];
    return descriptors.map((descriptor) => {
      const node = followForward(view.index, descriptor);
      if (node === undefined) {
        throw new UnregisteredServiceError(token);
      }
      const outcome = execute(view, planFor(view, node), env, boundary);
      if (!outcome.ok) {
        throw outcome.error;
      }
      return outcome.value;
    });
  };

  const freshPass = (base: Env): Env => contributors.reduce((env, feature) => feature.contribute?.(env) ?? env, base);

  /** A resolution surface bound to one boundary: its resolves announce there, and disposing it ends that boundary. */
  const scopeSurface = (base: Env, boundary: Boundary, viewOf: () => View): Scope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(viewOf(), token, freshPass(base), boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(viewOf(), token, freshPass(base), boundary) as T[],
    bindSurface: (surface: unknown): void => {
      surfaces.set(boundary.id, surface);
    },
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
  const prebakedNodes = (): GraphNode[] => topologicalOrder(rootView.graph).filter((node) => node.forwardTarget == null && effectiveLifetime(node) === Lifetime.Singleton && (node.eager === true || isAsyncNode(node)));

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
  const constructAsyncSingleton = async (node: AsyncNode): Promise<Outcome> => {
    const env = freshPass(rootBase);
    const token = rootView.graph.get(node)?.owner ?? (node.implementation as ServiceIdentifier<SourceType>);
    try {
      const value = await Promise.resolve(node.createInstanceAsync(inPassScope(rootView, env, rootBoundary)));
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
      // await its instance. A raw DescriptorMap can carry an async-factory node past the
      // type-level guard (hand-built descriptors), so this backstops it at build,
      // naming the token and pointing to the async builder (decisions.md §8).
      if (isAsyncNode(node)) {
        const token = rootView.graph.get(node)?.owner ?? (node.implementation as ServiceIdentifier<SourceType>);
        throw new Error(`Cannot build '${token.name}' synchronously: it is registered with an async factory (usingAsync). Use buildProviderAsync to build a provider with async registrations.`);
      }
      hold(node, execute(rootView, planFor(rootView, node), freshPass(rootBase), rootBoundary));
    }
  };

  /** Pre-bake deps-first, awaiting each async singleton's factory in turn (the async build boundary). */
  const prebakeAsync = async (): Promise<void> => {
    for (const node of prebakedNodes()) {
      hold(node, isAsyncNode(node) ? await constructAsyncSingleton(node) : execute(rootView, planFor(rootView, node), freshPass(rootBase), rootBoundary));
    }
  };

  /** Under `validate`, surface the first held singleton error at build rather than at first resolve. */
  const throwIfValidating = (): void => {
    if (options.validate === true && heldErrors.size > 0) {
      throw heldErrors.values().next().value;
    }
  };

  const assemble = (): Engine => {
    const root = scopeSurface(rootBase, rootBoundary, () => rootView);

    const createScope = (overlay?: ScopeOverlay): Scope => {
      if (composition.scoped === undefined) {
        throw new Error('createScope requires a scoped lifetime to be composed');
      }
      // A scope is its own boundary — constructions it resolves are announced there
      // and end when it is disposed. That per-boundary filing is the nearest-boundary
      // rule: a scope-resolved transient files under the scope, a root-resolved one
      // under the root (decisions.md §8; the tracker is {@link DisposalSink}).
      //
      // A scope with an overlay resolves through its own view, derived over the
      // scope's map: dynamic registrations extend the scope's plans (their edges are
      // definition-time, so the extension needs no construction), while root
      // registrations keep their descriptor identity — every feature cache and held
      // error keyed on a node still applies. The view is rebuilt when the overlay's
      // version says a registration landed.
      let cached: { readonly view: View; readonly version: number } | undefined;
      const viewOf = (): View => {
        if (overlay === undefined) {
          return rootView;
        }
        const { services: scopeServices, version } = overlay();
        if (cached === undefined || cached.version !== version) {
          cached = { view: makeView(scopeServices), version };
        }
        return cached.view;
      };
      return scopeSurface(composition.scoped.beginScope(), { id: Symbol('scope') }, viewOf);
    };

    return {
      resolve: root.resolve,
      resolveAll: root.resolveAll,
      createScope,
      bindSurface: root.bindSurface,
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
