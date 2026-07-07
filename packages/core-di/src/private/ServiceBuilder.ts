import { Lifetime } from '../enums';
import { InvalidServiceIdentifierError, ScopedSingletonRegistrationError } from '../errors';
import type { IAbstractServiceBuilder, INewableServiceBuilder } from '../interfaces';
import type { InstanceFactory, ResolvedDeps, ServiceDescriptor, ServiceIdentifier, ServiceImplementation, SourceType } from '../types';

type AddService = (identifier: ServiceIdentifier<SourceType>, descriptor: ServiceDescriptor<SourceType>) => void;

/**
 * Concrete-first registration builder. `register(Impl)` builds one descriptor
 * with a fresh identity token; each `.as()` / `.asSelf()` adds that same
 * descriptor under a face, so all faces of one call share one instance. The
 * builder implements both the newable and abstract surfaces; the newable /
 * abstract split (and thus whether `asSelf` is offered) is made at the return
 * type of `register`, not here.
 */
export class ServiceBuilder<T extends SourceType> implements INewableServiceBuilder<T>, IAbstractServiceBuilder<T> {
  private readonly descriptor: ServiceDescriptor<T>;
  private declaredIdentity = false;

  constructor(
    private readonly implementation: ServiceImplementation<T>,
    private readonly isScoped: boolean,
    private readonly addService: AddService,
  ) {
    this.descriptor = {
      implementation,
      cacheKey: Symbol(implementation.name),
      lifetime: Lifetime.Resolve,
      createInstance: () => new (implementation as ServiceImplementation<T>)(),
      usesFactory: false,
    };
  }

  public get hasIdentity(): boolean {
    return this.declaredIdentity;
  }

  public get registeredImplementation(): ServiceImplementation<T> {
    return this.implementation;
  }

  public as<F extends SourceType>(identifier: ServiceIdentifier<F> & (T extends F ? unknown : never)): this {
    if (identifier == null) {
      throw new InvalidServiceIdentifierError();
    }
    this.addFace(identifier as ServiceIdentifier<SourceType>);
    return this;
  }

  public asSelf(): this {
    this.addFace(this.implementation as ServiceIdentifier<SourceType>);
    return this;
  }

  public using(factory: InstanceFactory<T>): this;
  public using<const D extends readonly ServiceIdentifier<SourceType>[]>(deps: D, factory: (...args: ResolvedDeps<D>) => T): this;
  public using(depsOrFactory: InstanceFactory<T> | readonly ServiceIdentifier<SourceType>[], factory?: (...args: SourceType[]) => T): this {
    if (typeof depsOrFactory === 'function') {
      // Opaque form: `using((scope) => Impl)`. Dependencies are not declared, so
      // the factory is opaque and the graph chain terminates at this node.
      this.descriptor.createInstance = depsOrFactory;
      this.descriptor.usesFactory = true;
      return this;
    }
    // Declared-deps form: `using([deps], factory)`. The container resolves each
    // declared dep and hands them, positionally, to the factory. The declared
    // deps are recorded so validate()'s graph reads them statically (no probe).
    const deps = depsOrFactory;
    const build = factory as (...args: SourceType[]) => T;
    this.descriptor.createInstance = (scope) => build(...deps.map((dep) => scope.resolve(dep)));
    this.descriptor.usesFactory = true;
    this.descriptor.declaredDeps = deps;
    return this;
  }

  public singleton(): this {
    if (this.isScoped) {
      throw new ScopedSingletonRegistrationError();
    }
    this.descriptor.lifetime = Lifetime.Singleton;
    return this;
  }

  public scoped(): this {
    this.descriptor.lifetime = Lifetime.Scoped;
    return this;
  }

  public transient(): this {
    this.descriptor.lifetime = Lifetime.Transient;
    return this;
  }

  private addFace(identifier: ServiceIdentifier<SourceType>): void {
    this.declaredIdentity = true;
    this.addService(identifier, this.descriptor as ServiceDescriptor<SourceType>);
  }
}
