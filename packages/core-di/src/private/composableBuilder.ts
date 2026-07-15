import { Lifetime } from '../enums';
import { InvalidImplementationError, InvalidOperationError, InvalidServiceIdentifierError, ScopedSingletonRegistrationError } from '../errors';
import type { AbstractNewable, AsyncInstanceFactory, DescriptorMap, InstanceFactory, Newable, ServiceIdentifier, SourceType } from '../types';
import { createDescriptorMap } from '../types';
import { Messages } from './messages';
import { pushBucket } from './pushBucket';
import type { ComposableAbstractBuilder, ComposableCollection, ComposableNewableBuilder, ComposableNode, CreateCollectionOptions } from './types';

export const lifetimeVerbNames = {
  [Lifetime.Singleton]: 'singleton',
  [Lifetime.Scoped]: 'scoped',
  [Lifetime.Resolve]: 'resolve',
  [Lifetime.Transient]: 'transient',
} as const satisfies Record<Lifetime, string>;

export const createCollection = <const L extends Lifetime, const Async extends boolean = false>(lifetimes: readonly L[], options: CreateCollectionOptions<Async> = {}): ComposableCollection<L, Async> => {
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
      pushBucket(regs, token, node);
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
    // The verb list is exactly the composed lifetime set: transient is not appended
    // here. Defaulting no longer routes through a verb (the engine's defaultLifetime
    // owns it), so a composition that omits transient simply lacks the verb.
    for (const lifetime of lifetimes) {
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
