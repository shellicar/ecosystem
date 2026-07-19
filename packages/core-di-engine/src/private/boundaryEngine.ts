import { Lifetime, ResolveMultipleMode, RuntimeCaptivePolicy } from '../enums';
import { CaptiveDependencyError, CircularDependencyError, InvalidOperationError, MultipleRegistrationError, ServiceCreationError, UnregisteredServiceError } from '../errors';
import type { IResolutionScope } from '../interfaces';
import type { DescriptorMap, ServiceIdentifier, ServiceRegistration, SourceType } from '../types';
import { followForward } from './followForward';
import { asyncFactoryOnSyncPath, createScopeRequiresScoped, syncBuildOfAsyncFactory } from './messages';
import type { EngineView, Outcome, ResolutionStrategy, ResolvedField, StrategyFactory } from './strategy';
import type { AsyncNode, Env, GraphNode, LifetimeFeature, LifetimeFeatures } from './types';

const isAsyncNode = (node: GraphNode): node is AsyncNode => node.createInstanceAsync != null;

const EMPTY_BUCKET: readonly GraphNode[] = [];

export type EngineComposition = {
  readonly features?: LifetimeFeatures;
  readonly defaultLifetime?: Lifetime;
  /**
   * How construction is driven: the plan strategy (compile once, replay) or the
   * naive strategy (recursive walk, no graph machinery). Semantics are
   * identical; the choice trades compile cost and bundle bytes. Required so the
   * engine itself imports neither; the composition decides what gets bundled.
   */
  readonly strategy: StrategyFactory;
  /**
   * Construct every singleton at build, not just the `.eager()` and async ones.
   * Only singletons can prebake: the singleton table is the sole boundary that
   * exists at build. A composition whose default lifetime is singleton therefore
   * prebakes everything, paying all resolution cost at build.
   */
  readonly prebakeSingletons?: boolean;
  readonly disposal?: DisposalSink;
  readonly surfaceTokens?: ReadonlyMap<ServiceIdentifier<SourceType>, 'root' | 'boundary'>;
  readonly runtimeCaptivePolicy?: RuntimeCaptivePolicy;
};

export type Boundary = { readonly id: symbol };

export type DisposalSink = {
  announce(instance: unknown, boundary: Boundary): void;
  end(boundary: Boundary): void;
  endAsync?(boundary: Boundary): Promise<void>;
};

export type BuildEngineOptions = {
  readonly validate?: boolean;
  readonly registrationMode?: ResolveMultipleMode;
};

export type Scope = {
  resolve<T extends SourceType>(token: ServiceIdentifier<T>): T;
  resolveAll<T extends SourceType>(token: ServiceIdentifier<T>): T[];
  bindSurface(surface: unknown): void;
  printGraph(write: (line: string) => void): void;
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): Promise<void>;
};

export type ScopeOverlay = () => { readonly services: DescriptorMap; readonly version: number };

export type Engine = Scope & {
  createScope(overlay?: ScopeOverlay): Scope;
};

export type EngineFor<C extends EngineComposition> = Scope & (Lifetime.Scoped extends keyof NonNullable<C['features']> ? { createScope(overlay?: ScopeOverlay): Scope } : Record<never, never>);

const setupEngine = (services: DescriptorMap, composition: EngineComposition, options: BuildEngineOptions) => {
  const heldErrors = new Map<GraphNode, unknown>();
  const defaultLifetime = composition.defaultLifetime ?? Lifetime.Resolve;
  const disposal = composition.disposal;
  const runtimeCaptivePolicy = composition.runtimeCaptivePolicy;
  const constructing = new Set<GraphNode>();
  let singletonDepth = 0;
  let currentSingletonToken: ServiceIdentifier<SourceType> | undefined;
  const rootBoundary: Boundary = { id: Symbol('root') };
  const surfaces = new Map<symbol, unknown>();

  const features = composition.features ?? {};
  const featureFor = (lifetime: Lifetime): LifetimeFeature | undefined => features[lifetime];
  // The boundary-opening feature is whichever one declares beginScope, not one known by name.
  const boundaryFeature = Object.values(features).find((feature) => feature.beginScope != null);

  const isCached = (lifetime: Lifetime): boolean => featureFor(lifetime) !== undefined;

  const effectiveLifetime = (node: GraphNode): Lifetime => node.lifetime ?? defaultLifetime;

  const surfaceAt = (token: ServiceIdentifier<SourceType>): 'root' | 'boundary' | undefined => composition.surfaceTokens?.get(token);

  const surfaceValue = (at: 'root' | 'boundary', boundary: Boundary): unknown => surfaces.get(at === 'root' ? rootBoundary.id : boundary.id);

  const guardToken = (token: ServiceIdentifier<SourceType>, nodes: readonly GraphNode[]): unknown | undefined => {
    if (nodes.length > 1 && (options.registrationMode ?? ResolveMultipleMode.Error) === ResolveMultipleMode.Error) {
      return new MultipleRegistrationError(token);
    }
    return undefined;
  };

  const contributors = Object.values(features).filter((feature): feature is LifetimeFeature & { contribute: NonNullable<LifetimeFeature['contribute']> } => feature.contribute != null);

  const nodeForToken = (view: EngineView, token: ServiceIdentifier<SourceType>): GraphNode => {
    const bucket = view.index.get(token) ?? EMPTY_BUCKET;
    const guardError = guardToken(token, bucket);
    if (guardError !== undefined) {
      throw guardError;
    }
    const last = bucket[bucket.length - 1];
    const node = last === undefined ? undefined : last.forwardTarget != null ? followForward(view.index, last) : last;
    if (node === undefined) {
      throw new UnregisteredServiceError(token);
    }
    return node;
  };

  // The last-declared face wins for error identity, matching the derived graph's owner.
  const ownerOf = (view: EngineView, node: GraphNode): ServiceIdentifier<SourceType> => {
    let owner: ServiceIdentifier<SourceType> | undefined;
    for (const [token, descriptors] of view.services) {
      if (descriptors.includes(node)) {
        owner = token;
      }
    }
    return owner ?? (node.implementation as ServiceIdentifier<SourceType>);
  };

  const wrapForToken = (error: unknown, token: ServiceIdentifier<SourceType>, implementation: ServiceRegistration<SourceType>): unknown => {
    if (error instanceof ServiceCreationError && error.identifier !== token) {
      return new ServiceCreationError(token, error, implementation);
    }
    return error;
  };

  const cached = (lifetime: Lifetime, node: GraphNode, env: Env, build: () => unknown): unknown => {
    const feature = featureFor(lifetime);
    return feature === undefined ? build() : feature.getInstance(node, env, build);
  };

  const construct = (view: EngineView, node: GraphNode, token: ServiceIdentifier<SourceType>, lifetime: Lifetime, env: Env, boundary: Boundary, args: readonly SourceType[] | undefined, fields: readonly ResolvedField[]): object => {
    // An async factory can only be honoured at the async build boundary, and
    // prebake settles async singletons there: an async node reaching synchronous
    // construction is therefore on a wrong path (a non-singleton lifetime, or a
    // sync build), and running createInstance would silently discard the factory
    // and hand back the bare default. Refuse loudly instead.
    if (isAsyncNode(node)) {
      throw new InvalidOperationError(asyncFactoryOnSyncPath(token.name));
    }
    let instance: object;
    const isSingletonConstruction = lifetime === Lifetime.Singleton;
    const previousSingletonToken = currentSingletonToken;
    if (isSingletonConstruction) {
      singletonDepth++;
      currentSingletonToken = token;
    }
    const factory = node.createFromDeps;
    const tracksCycle = node.usesFactory === true && factory === undefined;
    if (tracksCycle) {
      constructing.add(node);
    }
    try {
      instance = (factory !== undefined && args !== undefined ? factory(args) : node.createInstance(inPassScope(view, env, boundary))) as object;
    } catch (err) {
      if (err instanceof CircularDependencyError || err instanceof CaptiveDependencyError) {
        throw err;
      }
      throw new ServiceCreationError(token, err instanceof Error ? err : undefined, node.implementation);
    } finally {
      if (tracksCycle) {
        constructing.delete(node);
      }
      if (isSingletonConstruction) {
        singletonDepth--;
        currentSingletonToken = previousSingletonToken;
      }
    }
    for (const { field, value } of fields) {
      (instance as Record<string, unknown>)[field] = value;
    }
    disposal?.announce(instance, lifetime === Lifetime.Singleton ? rootBoundary : boundary);
    return instance;
  };

  const strategy: ResolutionStrategy = composition.strategy({
    effectiveLifetime,
    isCached,
    surfaceAt,
    surfaceValue,
    guardToken,
    nodeForToken,
    ownerOf,
    heldErrorFor: (node) => heldErrors.get(node),
    wrapForToken,
    cached,
    construct,
  });

  const makeView = (viewServices: DescriptorMap): EngineView => ({ services: viewServices, index: viewServices, data: strategy.createView(viewServices) });

  const rootView = makeView(services);

  const inPassScope = (view: EngineView, env: Env, boundary: Boundary): IResolutionScope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(view, token, env, boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(view, token, env, boundary) as T[],
  });

  // The per-node guard, shared by both resolution doors (resolve and resolveAll):
  // an opaque factory re-entering itself is a cycle the static graph cannot see,
  // and a singleton mid-construction pulling a scoped token is a runtime captive,
  // whichever door the factory reached them through.
  const guardNode = (node: GraphNode, token: ServiceIdentifier<SourceType>): void => {
    if (node.usesFactory === true && constructing.has(node)) {
      throw new CircularDependencyError(token);
    }
    if (singletonDepth > 0 && runtimeCaptivePolicy === RuntimeCaptivePolicy.Throw && effectiveLifetime(node) === Lifetime.Scoped) {
      throw new CaptiveDependencyError(currentSingletonToken ?? token, token);
    }
  };

  const resolveValue = (view: EngineView, token: ServiceIdentifier<SourceType>, env: Env, boundary: Boundary): unknown => {
    const at = surfaceAt(token);
    if (at !== undefined) {
      return surfaceValue(at, boundary);
    }
    const node = nodeForToken(view, token);
    guardNode(node, token);
    const outcome = strategy.instanceFor(view, node, env, boundary);
    if (!outcome.ok) {
      throw outcome.error;
    }
    return outcome.value;
  };

  const resolveManyValue = (view: EngineView, token: ServiceIdentifier<SourceType>, env: Env, boundary: Boundary): unknown[] => {
    const descriptors = view.services.get(token) ?? [];
    return descriptors.map((descriptor) => {
      const node = followForward(view.index, descriptor);
      if (node === undefined) {
        throw new UnregisteredServiceError(token);
      }
      guardNode(node, token);
      const outcome = strategy.instanceFor(view, node, env, boundary);
      if (!outcome.ok) {
        throw outcome.error;
      }
      return outcome.value;
    });
  };

  const freshPass = (base: Env): Env => contributors.reduce((env, feature) => feature.contribute?.(env) ?? env, base);

  const scopeSurface = (base: Env, boundary: Boundary, viewOf: () => EngineView): Scope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(viewOf(), token, freshPass(base), boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(viewOf(), token, freshPass(base), boundary) as T[],
    bindSurface: (surface: unknown): void => {
      surfaces.set(boundary.id, surface);
    },
    printGraph: (write: (line: string) => void): void => {
      for (const line of strategy.graphLines(viewOf())) {
        write(line);
      }
    },
    [Symbol.dispose]: (): void => disposal?.end(boundary),
    [Symbol.asyncDispose]: async (): Promise<void> => {
      await disposal?.endAsync?.(boundary);
    },
  });

  const rootBase: Env = boundaryFeature?.beginScope?.() ?? {};

  const prebakedNodes = (): GraphNode[] => strategy.prebakeCandidates(rootView).filter((node) => node.forwardTarget == null && effectiveLifetime(node) === Lifetime.Singleton && (composition.prebakeSingletons === true || node.eager === true || isAsyncNode(node)));

  const hold = (node: GraphNode, outcome: Outcome): void => {
    if (!outcome.ok) {
      heldErrors.set(node, outcome.error);
    }
  };

  const constructAsyncSingleton = async (node: AsyncNode): Promise<Outcome> => {
    const env = freshPass(rootBase);
    const token = ownerOf(rootView, node);
    try {
      const value = await Promise.resolve(node.createInstanceAsync(inPassScope(rootView, env, rootBoundary)));
      const singleton = featureFor(Lifetime.Singleton);
      const seeded = singleton === undefined ? value : singleton.getInstance(node, env, () => value);
      disposal?.announce(seeded, rootBoundary);
      return { ok: true, value: seeded };
    } catch (err) {
      return { ok: false, error: new ServiceCreationError(token, err instanceof Error ? err : undefined, node.implementation) };
    }
  };

  // An async non-singleton is statically dead wiring: prebake settles async
  // singletons at the async build boundary, and no synchronous resolve can ever
  // honour the factory. One errant registration does not explode the build: the
  // error is held and thrown at resolve, or at build under validate.
  const holdAsyncNonSingletons = (): void => {
    for (const [token, descriptors] of rootView.services) {
      for (const node of descriptors) {
        if (node.forwardTarget == null && isAsyncNode(node) && effectiveLifetime(node) !== Lifetime.Singleton) {
          heldErrors.set(node, new InvalidOperationError(asyncFactoryOnSyncPath(token.name)));
        }
      }
    }
  };

  const prebakeSync = (): void => {
    holdAsyncNonSingletons();
    for (const node of prebakedNodes()) {
      if (isAsyncNode(node)) {
        const token = ownerOf(rootView, node);
        throw new InvalidOperationError(syncBuildOfAsyncFactory(token.name));
      }
      hold(node, strategy.instanceFor(rootView, node, freshPass(rootBase), rootBoundary));
    }
  };

  const prebakeAsync = async (): Promise<void> => {
    holdAsyncNonSingletons();
    for (const node of prebakedNodes()) {
      hold(node, isAsyncNode(node) ? await constructAsyncSingleton(node) : strategy.instanceFor(rootView, node, freshPass(rootBase), rootBoundary));
    }
  };

  const throwIfValidating = (): void => {
    if (options.validate === true && heldErrors.size > 0) {
      throw heldErrors.values().next().value;
    }
  };

  const assemble = (): Engine => {
    const root = scopeSurface(rootBase, rootBoundary, () => rootView);

    const createScope = (overlay?: ScopeOverlay): Scope => {
      if (boundaryFeature?.beginScope == null) {
        throw new InvalidOperationError(createScopeRequiresScoped);
      }
      const beginScope = boundaryFeature.beginScope;
      let cachedView: { readonly view: EngineView; readonly version: number } | undefined;
      const viewOf = (): EngineView => {
        if (overlay === undefined) {
          return rootView;
        }
        const { services: scopeServices, version } = overlay();
        if (cachedView === undefined || cachedView.version !== version) {
          cachedView = { view: makeView(scopeServices), version };
        }
        return cachedView.view;
      };
      return scopeSurface(beginScope(), { id: Symbol('scope') }, viewOf);
    };

    return {
      resolve: root.resolve,
      resolveAll: root.resolveAll,
      createScope,
      bindSurface: root.bindSurface,
      printGraph: root.printGraph,
      [Symbol.dispose]: root[Symbol.dispose],
      [Symbol.asyncDispose]: root[Symbol.asyncDispose],
    };
  };

  return { prebakeSync, prebakeAsync, throwIfValidating, assemble };
};

export const buildEngine = <C extends EngineComposition>(services: DescriptorMap, composition: C, options: BuildEngineOptions = {}): EngineFor<C> => {
  const engine = setupEngine(services, composition, options);
  engine.prebakeSync();
  engine.throwIfValidating();
  return engine.assemble() as EngineFor<C>;
};

export const buildEngineAsync = async <C extends EngineComposition>(services: DescriptorMap<SourceType, boolean>, composition: C, options: BuildEngineOptions = {}): Promise<EngineFor<C>> => {
  const engine = setupEngine(services as DescriptorMap, composition, options);
  await engine.prebakeAsync();
  engine.throwIfValidating();
  return engine.assemble() as EngineFor<C>;
};
