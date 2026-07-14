import { Lifetime, ResolveMultipleMode, RuntimeCaptivePolicy } from '../enums';
import { CaptiveDependencyError, CircularDependencyError, InvalidOperationError, MultipleRegistrationError, ServiceCreationError, UnregisteredServiceError } from '../errors';
import type { IResolutionScope } from '../interfaces';
import type { AsyncInstanceFactory, DescriptorMap, ServiceIdentifier, ServiceRegistration, SourceType } from '../types';
import { buildPlan, deriveFacts, followForward, formatGraph, type Graph, type GraphNode, type OwnerIndex, type Plan, type PlanStep, topologicalOrder } from './graph';
import type { Env, LifetimeFeature } from './lifetimeContracts';
import type { ScopedLifetime } from './lifetimeScoped';

type AsyncNode = GraphNode & { createInstanceAsync: AsyncInstanceFactory<SourceType> };

const isAsyncNode = (node: GraphNode): node is AsyncNode => node.createInstanceAsync != null;

const EMPTY_BUCKET: readonly GraphNode[] = [];

export type EngineComposition = {
  readonly singleton?: LifetimeFeature;
  readonly scoped?: ScopedLifetime;
  readonly resolve?: LifetimeFeature;
  readonly defaultLifetime?: Lifetime;
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

export type EngineFor<C extends EngineComposition> = Scope & ('scoped' extends keyof C ? { createScope(overlay?: ScopeOverlay): Scope } : Record<never, never>);

type Outcome = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: unknown };

const ok = (value: unknown): Outcome => ({ ok: true, value });
const failed = (error: unknown): Outcome => ({ ok: false, error });

type View = {
  readonly services: DescriptorMap;
  readonly graph: Graph;
  readonly index: OwnerIndex;
  readonly planCache: Map<GraphNode, Plan>;
};

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

  const isCached = (lifetime: Lifetime): boolean => featureFor(lifetime) !== undefined;

  const effectiveLifetime = (node: GraphNode): Lifetime => node.lifetime ?? defaultLifetime;

  const surfaceEntries: readonly (readonly [ServiceIdentifier<SourceType>, 'root' | 'boundary'])[] = composition.surfaceTokens ? [...composition.surfaceTokens] : [];
  const surfaceAt = (token: ServiceIdentifier<SourceType>): 'root' | 'boundary' | undefined => {
    for (const [surfaceToken, at] of surfaceEntries) {
      if (surfaceToken === token) {
        return at;
      }
    }
    return undefined;
  };

  const guardToken = (token: ServiceIdentifier<SourceType>, nodes: readonly GraphNode[]): unknown | undefined => {
    if (nodes.length > 1 && (options.registrationMode ?? ResolveMultipleMode.Error) === ResolveMultipleMode.Error) {
      return new MultipleRegistrationError(token);
    }
    return undefined;
  };

  const contributors = [composition.resolve].filter((feature): feature is LifetimeFeature => feature?.contribute != null);

  const makeView = (viewServices: DescriptorMap): View => {
    const graph = deriveFacts(viewServices);
    return { services: viewServices, graph, index: viewServices, planCache: new Map() };
  };

  const rootView = makeView(services);

  const planFor = (view: View, node: GraphNode): Plan => {
    let plan = view.planCache.get(node);
    if (plan === undefined) {
      plan = buildPlan(view.graph, view.index, node, effectiveLifetime, isCached, surfaceAt, guardToken);
      view.planCache.set(node, plan);
    }
    return plan;
  };

  const inPassScope = (view: View, env: Env, boundary: Boundary): IResolutionScope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(view, token, env, boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(view, token, env, boundary) as T[],
  });

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
    for (const slot of step.args) {
      const dependency = locals[slot];
      if (!dependency.ok) {
        return failed(wrapForToken(dependency.error, step.token, step.node.implementation));
      }
    }
    const build = (): unknown => {
      let instance: object;
      const isSingletonConstruction = step.lifetime === Lifetime.Singleton;
      const previousSingletonToken = currentSingletonToken;
      if (isSingletonConstruction) {
        singletonDepth++;
        currentSingletonToken = step.token;
      }
      const factory = step.node.createFromDeps;
      const tracksCycle = step.node.usesFactory === true && factory === undefined;
      if (tracksCycle) {
        constructing.add(step.node);
      }
      try {
        instance = (factory !== undefined ? factory(step.args.map((slot) => (locals[slot] as { value: SourceType }).value)) : step.node.createInstance(inPassScope(view, env, boundary))) as object;
      } catch (err) {
        if (err instanceof CircularDependencyError || err instanceof CaptiveDependencyError) {
          throw err;
        }
        throw new ServiceCreationError(step.token, err instanceof Error ? err : undefined, step.node.implementation);
      } finally {
        if (tracksCycle) {
          constructing.delete(step.node);
        }
        if (isSingletonConstruction) {
          singletonDepth--;
          currentSingletonToken = previousSingletonToken;
        }
      }
      for (const { field, slot } of step.fields) {
        (instance as Record<string, unknown>)[field] = (locals[slot] as { value: unknown }).value;
      }
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
    const bucket = view.index.get(token) ?? EMPTY_BUCKET;
    if (bucket.length > 1 && (options.registrationMode ?? ResolveMultipleMode.Error) === ResolveMultipleMode.Error) {
      throw new MultipleRegistrationError(token);
    }
    const last = bucket[bucket.length - 1];
    const node = last === undefined ? undefined : last.forwardTarget != null ? followForward(view.index, last) : last;
    if (node === undefined) {
      throw new UnregisteredServiceError(token);
    }
    if (node.usesFactory === true && constructing.has(node)) {
      throw new CircularDependencyError(token);
    }
    if (singletonDepth > 0 && runtimeCaptivePolicy === RuntimeCaptivePolicy.Throw && effectiveLifetime(node) === Lifetime.Scoped) {
      throw new CaptiveDependencyError(currentSingletonToken ?? token, token);
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

  const scopeSurface = (base: Env, boundary: Boundary, viewOf: () => View): Scope => ({
    resolve: <T extends SourceType>(token: ServiceIdentifier<T>): T => resolveValue(viewOf(), token, freshPass(base), boundary) as T,
    resolveAll: <T extends SourceType>(token: ServiceIdentifier<T>): T[] => resolveManyValue(viewOf(), token, freshPass(base), boundary) as T[],
    bindSurface: (surface: unknown): void => {
      surfaces.set(boundary.id, surface);
    },
    printGraph: (write: (line: string) => void): void => {
      for (const line of formatGraph(viewOf().graph, effectiveLifetime)) {
        write(line);
      }
    },
    [Symbol.dispose]: (): void => disposal?.end(boundary),
    [Symbol.asyncDispose]: async (): Promise<void> => {
      await disposal?.endAsync?.(boundary);
    },
  });

  const rootBase: Env = composition.scoped?.beginScope() ?? {};

  const prebakedNodes = (): GraphNode[] => topologicalOrder(rootView.graph).filter((node) => node.forwardTarget == null && effectiveLifetime(node) === Lifetime.Singleton && (node.eager === true || isAsyncNode(node)));

  const hold = (node: GraphNode, outcome: Outcome): void => {
    if (!outcome.ok) {
      heldErrors.set(node, outcome.error);
    }
  };

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

  const prebakeSync = (): void => {
    for (const node of prebakedNodes()) {
      if (isAsyncNode(node)) {
        const token = rootView.graph.get(node)?.owner ?? (node.implementation as ServiceIdentifier<SourceType>);
        throw new InvalidOperationError(`Cannot build '${token.name}' synchronously: it is registered with an async factory (usingAsync). Use buildProviderAsync to build a provider with async registrations.`);
      }
      hold(node, execute(rootView, planFor(rootView, node), freshPass(rootBase), rootBoundary));
    }
  };

  const prebakeAsync = async (): Promise<void> => {
    for (const node of prebakedNodes()) {
      hold(node, isAsyncNode(node) ? await constructAsyncSingleton(node) : execute(rootView, planFor(rootView, node), freshPass(rootBase), rootBoundary));
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
      if (composition.scoped === undefined) {
        throw new InvalidOperationError('createScope requires a scoped lifetime to be composed. This composition omits it, so it has no scope to open.');
      }
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
