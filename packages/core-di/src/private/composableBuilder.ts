import { Lifetime } from '../enums';
import { InvalidImplementationError, InvalidOperationError, InvalidServiceIdentifierError, ScopedSingletonRegistrationError } from '../errors';
import type { AbstractNewable, AsyncInstanceFactory, DescriptorMap, InstanceFactory, Newable, ResolvedDeps, ServiceDescriptor, ServiceIdentifier, SourceType } from '../types';
import { createDescriptorMap } from '../types';
import { Messages } from './messages';

const lifetimeVerbNames = {
  [Lifetime.Singleton]: 'singleton',
  [Lifetime.Scoped]: 'scoped',
  [Lifetime.Resolve]: 'resolve',
  [Lifetime.Transient]: 'transient',
} as const satisfies Record<Lifetime, string>;

type VerbName<L extends Lifetime> = (typeof lifetimeVerbNames)[L];

export type ComposableLifetime = Exclude<Lifetime, Lifetime.Transient>;

type EagerVerb<B> = {
  eager(): B;
};

type NewableLifetimeVerbs<T extends SourceType, L extends Lifetime, Async extends boolean> = {
  readonly [K in L as VerbName<K>]: () => ComposableNewableBuilder<T, L, Async, K extends Lifetime.Singleton ? true : false, true>;
};

type AbstractLifetimeVerbs<T extends SourceType, L extends Lifetime, Async extends boolean> = {
  readonly [K in L as VerbName<K>]: () => ComposableAbstractBuilder<T, L, Async, K extends Lifetime.Singleton ? true : false, true>;
};

type AsyncVerb<T extends SourceType, L extends Lifetime, Async extends boolean, Eager extends boolean> = Async extends true
  ? {
      usingAsync(factory: AsyncInstanceFactory<T>): ComposableNewableBuilder<T, L, Async, Eager>;
      usingAsync<const D extends readonly ServiceIdentifier<SourceType>[]>(deps: D, factory: (...args: ResolvedDeps<D>) => Promise<T>): ComposableNewableBuilder<T, L, Async, Eager>;
    }
  : unknown;

export type ComposableNewableBuilder<T extends SourceType, L extends Lifetime, Async extends boolean, Eager extends boolean = false, LifeSet extends boolean = false> = {
  as<F extends SourceType>(identifier: ServiceIdentifier<F> & (T extends F ? unknown : never)): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  asSelf(): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  using(factory: InstanceFactory<T>): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  using<const D extends readonly ServiceIdentifier<SourceType>[]>(deps: D, factory: (...args: ResolvedDeps<D>) => T): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
} & (LifeSet extends true ? unknown : NewableLifetimeVerbs<T, L | Lifetime.Transient, Async>) &
  AsyncVerb<T, L, Async, Eager> &
  (Eager extends true ? EagerVerb<ComposableNewableBuilder<T, L, Async, false, LifeSet>> : unknown);

export type ComposableAbstractBuilder<T extends SourceType, L extends Lifetime, Async extends boolean, Eager extends boolean = false, LifeSet extends boolean = false> = {
  as<F extends SourceType>(identifier: ServiceIdentifier<F> & (T extends F ? unknown : never)): ComposableAbstractBuilder<T, L, Async, Eager, LifeSet>;
  using(factory: InstanceFactory<T>): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
  using<const D extends readonly ServiceIdentifier<SourceType>[]>(deps: D, factory: (...args: ResolvedDeps<D>) => T): ComposableNewableBuilder<T, L, Async, Eager, LifeSet>;
} & (LifeSet extends true ? unknown : AbstractLifetimeVerbs<T, L | Lifetime.Transient, Async>) &
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

export const createCollection = <const L extends ComposableLifetime, const Async extends boolean = false>(lifetimes: readonly L[], options: CreateCollectionOptions<Async> = {}): ComposableCollection<L, Async> => {
  const async = options.async === true;
  const regs = createDescriptorMap<SourceType>() as DescriptorMap<SourceType, Async>;
  const withoutFace = new Set<ComposableNode>();

  const register = <T extends SourceType>(impl: Newable<T> | AbstractNewable<T>): ComposableNewableBuilder<T, L, Async> | ComposableAbstractBuilder<T, L, Async> => {
    if (impl == null) {
      throw new InvalidImplementationError<T>(undefined);
    }
    const node: ComposableNode = {
      implementation: impl as Newable<SourceType>,
      cacheKey: Symbol(impl.name),
      createInstance: () => new (impl as Newable<SourceType>)(),
      usesFactory: false,
    };
    withoutFace.add(node);
    const addFace = (token: ServiceIdentifier<SourceType>): void => {
      if (token == null) {
        throw new InvalidServiceIdentifierError();
      }
      withoutFace.delete(node);
      const bucket = regs.get(token);
      if (bucket === undefined) {
        regs.set(token, [node]);
      } else {
        bucket.push(node);
      }
      options.onFace?.(token, node);
    };
    // One body serves both using and usingAsync: they differ only in which descriptor
    // field the factory lands on. Only the sync deps form gains createFromDeps — that is
    // the engine's static-plan fast path, and an async factory never runs on it.
    const setFactory = (field: 'createInstance' | 'createInstanceAsync', depsOrFactory: InstanceFactory<SourceType> | AsyncInstanceFactory<SourceType> | readonly ServiceIdentifier<SourceType>[], factory?: (...args: SourceType[]) => SourceType | Promise<SourceType>) => {
      node.usesFactory = true;
      if (typeof depsOrFactory === 'function') {
        node[field] = depsOrFactory as InstanceFactory<SourceType> & AsyncInstanceFactory<SourceType>;
        return builder;
      }
      const deps = depsOrFactory;
      const build = factory as (...args: SourceType[]) => SourceType & Promise<SourceType>;
      if (field === 'createInstance') {
        node.createFromDeps = (args) => build(...args);
      }
      node[field] = (scope) => build(...deps.map((dep) => scope.resolve(dep)));
      node.declaredDeps = deps;
      return builder;
    };
    const builder: Record<string, unknown> = {
      as(token: ServiceIdentifier<SourceType>) {
        addFace(token);
        return builder;
      },
      asSelf() {
        addFace(node.implementation as ServiceIdentifier<SourceType>);
        return builder;
      },
      using: (depsOrFactory: InstanceFactory<SourceType> | readonly ServiceIdentifier<SourceType>[], factory?: (...args: SourceType[]) => SourceType) => setFactory('createInstance', depsOrFactory, factory),
    };
    builder.usingAsync = async
      ? (depsOrFactory: AsyncInstanceFactory<SourceType> | readonly ServiceIdentifier<SourceType>[], factory?: (...args: SourceType[]) => Promise<SourceType>) => setFactory('createInstanceAsync', depsOrFactory, factory)
      : () => {
          throw new InvalidOperationError(Messages.usingAsyncRequiresAsyncCollection);
        };
    builder.eager = () => {
      node.eager = true;
      return builder;
    };
    for (const lifetime of [...lifetimes, Lifetime.Transient]) {
      builder[lifetimeVerbNames[lifetime]] = () => {
        if (node.lifetime !== undefined) {
          throw new InvalidOperationError(Messages.lifetimeAlreadySet(node.lifetime));
        }
        if (lifetime === Lifetime.Singleton && options.scoped === true) {
          throw new ScopedSingletonRegistrationError();
        }
        node.lifetime = lifetime;
        return builder;
      };
    }
    return builder as ComposableNewableBuilder<T, L, Async>;
  };
  return { regs, register: register as ComposableCollection<L, Async>['register'], unfaced: () => [...withoutFace] };
};

export const toDescriptorMap = <L extends Lifetime, Async extends boolean>(collection: ComposableCollection<L, Async>): DescriptorMap<SourceType, Async> => collection.regs;
