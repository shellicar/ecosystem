import type { Lifetime } from '../enums';
import type { AbstractNewable, AsyncInstanceFactory, DescriptorMap, InstanceFactory, Newable, ResolvedDeps, ServiceDescriptor, ServiceIdentifier, SourceType, ValidationProblem } from '../types';
import type { DisposalSink, Boundary } from './boundaryEngine';
import type { lifetimeVerbNames } from './composableBuilder';

export type AsyncNode = GraphNode & { createInstanceAsync: AsyncInstanceFactory<SourceType>; };export type VerbName<L extends Lifetime> = (typeof lifetimeVerbNames)[L];
export type EagerVerb<B> = {
  eager(): B;
};
export type NewableLifetimeVerbs<T extends SourceType, L extends Lifetime, Async extends boolean> = {
  readonly [K in L as VerbName<K>]: () => ComposableNewableBuilder<T, L, Async, K extends Lifetime.Singleton ? true : false, true>;
};
export type AbstractLifetimeVerbs<T extends SourceType, L extends Lifetime, Async extends boolean> = {
  readonly [K in L as VerbName<K>]: () => ComposableAbstractBuilder<T, L, Async, K extends Lifetime.Singleton ? true : false, true>;
};
export type AsyncVerb<T extends SourceType, L extends Lifetime, Async extends boolean, Eager extends boolean> = Async extends true ? {
  usingAsync(factory: AsyncInstanceFactory<T>): ComposableNewableBuilder<T, L, Async, Eager>;
  usingAsync<const D extends readonly ServiceIdentifier<SourceType>[]>(deps: D, factory: (...args: ResolvedDeps<D>) => Promise<T>): ComposableNewableBuilder<T, L, Async, Eager>;
} : unknown;

export type ComposableNewableBuilder<T extends SourceType, L extends Lifetime, Async extends boolean, Eager extends boolean = false, LifeSet extends boolean = false> = {
  as<F extends SourceType>(identifier: ServiceIdentifier<F> & (T extends F ? unknown : never)): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  asSelf(): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  using(factory: InstanceFactory<T>): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  using<const D extends readonly ServiceIdentifier<SourceType>[]>(deps: D, factory: (...args: ResolvedDeps<D>) => T): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
} & (LifeSet extends true ? unknown : NewableLifetimeVerbs<T, L, Async>) &
  AsyncVerb<T, L, Async, Eager> &
  (Eager extends true ? EagerVerb<ComposableNewableBuilder<T, L, Async, false, LifeSet>> : unknown);

export type ComposableAbstractBuilder<T extends SourceType, L extends Lifetime, Async extends boolean, Eager extends boolean = false, LifeSet extends boolean = false> = {
  as<F extends SourceType>(identifier: ServiceIdentifier<F> & (T extends F ? unknown : never)): ComposableAbstractBuilder<T, L, Async, Eager, LifeSet>;
  using(factory: InstanceFactory<T>): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  using<const D extends readonly ServiceIdentifier<SourceType>[]>(deps: D, factory: (...args: ResolvedDeps<D>) => T): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
} & (LifeSet extends true ? unknown : AbstractLifetimeVerbs<T, L, Async>) &
  AsyncVerb<T, L, Async, Eager> &
  (Eager extends true ? EagerVerb<ComposableAbstractBuilder<T, L, Async, false, LifeSet>> : unknown);

export type ComposableNode = ServiceDescriptor<SourceType>;

export type ComposableCollection<L extends Lifetime, Async extends boolean> = {
  readonly regs: DescriptorMap<SourceType, Async>;
  register<T extends SourceType>(impl: Newable<T>): ComposableNewableBuilder<T, L, Async>;
  register<T extends SourceType>(impl: AbstractNewable<T>): ComposableAbstractBuilder<T, L, Async>;
  unfaced(): ComposableNode[];
};

export type CreateCollectionOptions<Async extends boolean> = {
  readonly async?: Async;
  readonly scoped?: boolean;
  readonly onFace?: (token: ServiceIdentifier<SourceType>, descriptor: ComposableNode) => void;
};
export type SyncDisposable = { [Symbol.dispose](): void; };
export type AsyncDisposable = { [Symbol.asyncDispose](): PromiseLike<void>; };

export type Disposal = DisposalSink & {
  endAsync(boundary: Boundary): Promise<void>;
};
export type AddService = (identifier: ServiceIdentifier<SourceType>, descriptor: ServiceDescriptor<SourceType>) => void;
export type GraphFacts = {
  readonly lifetime: Lifetime | undefined;
  readonly owner: ServiceIdentifier<SourceType>;
  readonly owners: readonly ServiceIdentifier<SourceType>[];
  readonly deps: readonly ServiceIdentifier<SourceType>[];
  readonly isAsync: boolean;
};

export type GraphNode = ServiceDescriptor<SourceType>;

export type Graph = ReadonlyMap<GraphNode, GraphFacts>;

export type Cycle = readonly GraphNode[];

export type UnregisteredEdge = {
  readonly from: GraphNode;
  readonly missing: ServiceIdentifier<SourceType>;
};
export type Env = Readonly<Record<symbol, object>>;

export type BuildFn = () => unknown;

export type CacheKey = object;

export type LifetimeFeature = {
  readonly facts: { readonly owner: string; };
  readonly getInstance: (key: CacheKey, env: Env, build: BuildFn) => unknown;
  readonly contribute?: (env: Env) => Env;
  // A feature that opens a boundary (scoped): the engine derives createScope from its presence.
  readonly beginScope?: () => Env;
};
export type ScopedLifetime = LifetimeFeature & {
  readonly beginScope: () => Env;
};
// The open lifetime set: the engine looks features up by verb, never by name.
export type LifetimeFeatures = { readonly [K in Lifetime]?: LifetimeFeature };
export type ClassMetadata = Record<string | symbol, unknown>;
export type GraphPolicy = (graph: Graph) => ValidationProblem[];
