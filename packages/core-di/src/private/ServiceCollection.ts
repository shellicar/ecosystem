import {
  type AbstractNewable,
  asyncThroughSyncPathPolicy,
  buildEngine,
  buildEngineAsync,
  type ComposableCollection,
  captivePolicyFor,
  createCollection,
  createDisposal,
  createPlanStrategy,
  createResolveLifetime,
  createScopedLifetime,
  createSingletonLifetime,
  cyclePolicy,
  type DescriptorMap,
  deriveFacts,
  ForwardBuilder,
  type IForwardBuilder,
  InvalidOperationError,
  InvalidServiceIdentifierError,
  IResolutionScope,
  type IScopedForwardBuilder,
  Lifetime,
  missingTargetPolicy,
  type Newable,
  noDeclaredIdentity,
  overrideLifetimePreBuildOnly,
  pushBucket,
  runGraphPolicies,
  ScopedForwardBuilder,
  type ServiceDescriptor,
  type ServiceIdentifier,
  type SourceType,
  ValidationError,
  type ValidationProblem,
  ValidationProblemKind,
  type ValidationReport,
} from '@shellicar/core-di-engine';
import type { IAbstractServiceBuilder, INewableServiceBuilder, IScopedAbstractServiceBuilder, IScopedNewableServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import { IScopedProvider, type IScopedServiceCollection, IServiceProvider as IServiceProviderToken } from '../interfaces';
import type { ILogger } from '../logger';
import type { BuildProviderOptions, InstrumentationHook, InstrumentationOptions, ServiceCollectionOptions, ServiceModuleType } from '../types';
import { ServiceProvider } from './provider';

// Transient is passed like any other verb: the builder no longer appends it. It is
// still the floor at resolution (no feature in the composition caches it).
const composedLifetimes = [Lifetime.Singleton, Lifetime.Scoped, Lifetime.Resolve, Lifetime.Transient] as const satisfies readonly Lifetime[];

const activeHook = (instrument: InstrumentationOptions | undefined): InstrumentationHook | undefined => (instrument?.enabled === true ? instrument.onTiming : undefined);

// The root collection: register()/forward() carry no .shadow(), in their types or at
// runtime. ScopedServiceCollection (below) is the only source of a shadow-capable
// collection, born from cloneShared() when a scope is created.
export class ServiceCollection implements IServiceCollection {
  protected readonly composed: ComposableCollection<Lifetime, boolean>;
  private version = 0;
  private built = false;

  constructor(
    protected readonly logger: ILogger,
    public readonly options: ServiceCollectionOptions,
    isScoped: boolean,
    protected readonly isAsync: boolean,
    protected readonly shadowDepth: number = 0,
  ) {
    this.composed = createCollection(composedLifetimes, {
      async: this.isAsync,
      scoped: isScoped,
      shadowDepth: this.shadowDepth,
      onFace: (identifier, descriptor) => {
        this.logger.info('Adding service', { identifier: identifier.name, descriptor });
        this.version++;
      },
    });
  }

  protected get services(): DescriptorMap {
    return this.composed.regs as DescriptorMap;
  }

  public registerModules(...modules: ServiceModuleType[]): void {
    for (const x of modules) {
      const module = new x();
      module.registerServices(this);
    }
  }

  get<T extends SourceType>(key: ServiceIdentifier<T>): ServiceDescriptor<T>[] {
    return (this.services.get(key) ?? []) as ServiceDescriptor<T>[];
  }

  public overrideLifetime<T extends SourceType>(identifier: ServiceIdentifier<T>, lifetime: Lifetime): void {
    if (this.built) {
      throw new InvalidOperationError(overrideLifetimePreBuildOnly);
    }
    for (const descriptor of this.get(identifier)) {
      if (descriptor.forwardTarget == null) {
        descriptor.lifetime = lifetime;
      }
    }
  }

  public register<T extends SourceType>(implementation: Newable<T>): INewableServiceBuilder<T>;
  public register<T extends SourceType>(implementation: AbstractNewable<T>): IAbstractServiceBuilder<T>;
  public register<T extends SourceType>(implementation: AbstractNewable<T>): INewableServiceBuilder<T> | IAbstractServiceBuilder<T> {
    return this.composed.register(implementation as Newable<T>) as INewableServiceBuilder<T>;
  }

  // Shared by both classes' forward(): the only difference between them is which
  // ForwardBuilder flavour they construct.
  protected addService(identifier: ServiceIdentifier<SourceType>, descriptor: ServiceDescriptor<SourceType>): void {
    pushBucket(this.services, identifier, descriptor);
    this.logger.info('Adding service', { identifier: identifier.name, descriptor });
    this.version++;
  }

  public forward<S extends SourceType>(source: ServiceIdentifier<S>): IForwardBuilder<S> {
    if (source == null) {
      throw new InvalidServiceIdentifierError();
    }
    return new ForwardBuilder<S>(source, (identifier, descriptor) => this.addService(identifier, descriptor), this.shadowDepth);
  }

  // The one stamping point: every consumer that turns descriptors into a graph
  // (validate, buildProvider, a scope overlay's snapshot) stamps through here, so
  // the engine and the policies always judge the same concrete lifetimes.
  private stampLifetimes(): void {
    for (const descriptors of this.services.values()) {
      for (const descriptor of descriptors) {
        if (descriptor.forwardTarget == null && descriptor.lifetime === undefined) {
          descriptor.lifetime = this.options.defaultLifetime;
          descriptor.stamped = true;
        }
      }
    }
  }

  public validate(): ValidationReport {
    const problems: ValidationProblem[] = [];
    for (const node of this.composed.unfaced()) {
      problems.push({
        kind: ValidationProblemKind.NoIdentity,
        message: noDeclaredIdentity(node.implementation.name),
      });
    }
    // Stamp a throwaway clone, not the live collection: registrations may still
    // be verbed after a standalone validate().
    const stamped = this.clone() as ServiceCollection;
    stamped.stampLifetimes();
    const graph = deriveFacts(stamped.services);
    problems.push(...runGraphPolicies(graph, [missingTargetPolicy, cyclePolicy, asyncThroughSyncPathPolicy, captivePolicyFor(this.options.captivePolicy)]));
    return { valid: problems.length === 0, problems };
  }

  // clone and cloneShared differ only in how a descriptor crosses: clone takes a memoised
  // copy (a multi-face descriptor stays one object in the clone), cloneShared shares the
  // descriptor itself so scope overlays see the same nodes. Each caller constructs its own
  // class directly, so the class a caller ends up with is provably the one it constructed,
  // not an assertion on top of a boolean.
  private copyInto(cloned: ServiceCollection, copyOf: (descriptor: ServiceDescriptor<SourceType>) => ServiceDescriptor<SourceType>): void {
    for (const [key, descriptors] of this.services) {
      cloned.services.set(key, descriptors.map(copyOf));
    }
  }

  public clone(scoped?: unknown): IServiceCollection {
    const copies = new Map<ServiceDescriptor<SourceType>, ServiceDescriptor<SourceType>>();
    const copyOf = (descriptor: ServiceDescriptor<SourceType>): ServiceDescriptor<SourceType> => {
      let copy = copies.get(descriptor);
      if (copy === undefined) {
        copy = { ...descriptor };
        copies.set(descriptor, copy);
      }
      return copy;
    };
    const cloned = scoped === true ? new ScopedServiceCollection(this.logger, this.options, true, this.isAsync, this.shadowDepth) : new ServiceCollection(this.logger, this.options, false, this.isAsync, this.shadowDepth);
    this.copyInto(cloned, copyOf);
    return cloned;
  }

  // A genuinely new scope, one generation deeper than this collection: shadow's
  // ancestry check (winnerOf/guardToken, keyed by shadowDepth) is what lets a scope
  // override an ancestor's registration but not a sibling registered alongside it
  // in the same collection.
  public cloneShared(): ScopedServiceCollection {
    const cloned = new ScopedServiceCollection(this.logger, this.options, true, this.isAsync, this.shadowDepth + 1);
    this.copyInto(cloned, (descriptor) => descriptor);
    return cloned;
  }

  public snapshot(): { readonly services: DescriptorMap; readonly version: number } {
    this.stampLifetimes();
    return { services: this.services, version: this.version };
  }

  private composition() {
    return {
      features: {
        [Lifetime.Singleton]: createSingletonLifetime(),
        [Lifetime.Scoped]: createScopedLifetime(),
        [Lifetime.Resolve]: createResolveLifetime(),
      },
      strategy: createPlanStrategy(),
      prebakeSingletons: this.options.eagerSingletons,
      disposal: createDisposal(),
      runtimeCaptivePolicy: this.options.runtimeCaptivePolicy,
      surfaceTokens: new Map<ServiceIdentifier<SourceType>, 'root' | 'boundary'>([
        [IServiceProviderToken as ServiceIdentifier<SourceType>, 'root'],
        [IScopedProvider as ServiceIdentifier<SourceType>, 'boundary'],
        [IResolutionScope as ServiceIdentifier<SourceType>, 'boundary'],
      ]),
    };
  }

  private freeze(options?: BuildProviderOptions): ServiceCollection {
    if (options?.validate) {
      const report = this.validate();
      if (!report.valid) {
        throw new ValidationError(report.problems);
      }
    }
    this.built = true;
    const frozen = this.clone() as ServiceCollection;
    frozen.built = true;
    frozen.stampLifetimes();
    return frozen;
  }

  // A prebaked construction failure is only ever thrown when the engine is told
  // to validate; without eagerSingletons defaulting it here, a failing eager
  // singleton would construct at buildProvider but only throw at the first
  // resolve of that token, defeating the fail-fast point of the option. An
  // explicit `validate` still wins either way.
  private engineOptions(options?: BuildProviderOptions) {
    return { validate: options?.validate ?? this.options.eagerSingletons, registrationMode: this.options.registrationMode };
  }

  // bindRoot runs between the engine's assembly and its prebake, so the root provider
  // exists (and any `.eager()` singleton resolving IServiceProvider sees it) before
  // prebake constructs anything. Its return value is buildEngine's own return value,
  // so there is nothing here that can observe an unbound provider. If prebake or
  // validate throws after this runs, the provider it created is simply unreachable
  // (never returned to a caller, never referenced by anything else) and is collected
  // with the rest of the failed build — it holds no resources of its own to release.
  private announceBuild(onTiming: InstrumentationHook | undefined, start: number | undefined): void {
    if (start !== undefined) {
      onTiming?.({ kind: 'build', durationMs: performance.now() - start });
    }
  }

  public buildProvider(options?: BuildProviderOptions): IServiceProvider {
    const onTiming = activeHook(options?.instrument);
    const start = onTiming === undefined ? undefined : performance.now();
    const frozen = this.freeze(options);
    const provider = buildEngine(frozen.services, this.composition(), this.engineOptions(options), (engine) => ServiceProvider.createRoot(this.logger, frozen, engine, onTiming));
    this.announceBuild(onTiming, start);
    return provider;
  }

  public async buildProviderAsync(options?: BuildProviderOptions): Promise<IServiceProvider> {
    const onTiming = activeHook(options?.instrument);
    const start = onTiming === undefined ? undefined : performance.now();
    const frozen = this.freeze(options);
    const provider = await buildEngineAsync(frozen.services, this.composition(), this.engineOptions(options), (engine) => ServiceProvider.createRoot(this.logger, frozen, engine, onTiming));
    this.announceBuild(onTiming, start);
    return provider;
  }
}

export class ScopedServiceCollection extends ServiceCollection implements IScopedServiceCollection {
  public override register<T extends SourceType>(implementation: Newable<T>): IScopedNewableServiceBuilder<T>;
  public override register<T extends SourceType>(implementation: AbstractNewable<T>): IScopedAbstractServiceBuilder<T>;
  public override register<T extends SourceType>(implementation: AbstractNewable<T>): IScopedNewableServiceBuilder<T> | IScopedAbstractServiceBuilder<T> {
    return this.composed.register(implementation as Newable<T>) as IScopedNewableServiceBuilder<T>;
  }

  public override forward<S extends SourceType>(source: ServiceIdentifier<S>): IScopedForwardBuilder<S> {
    if (source == null) {
      throw new InvalidServiceIdentifierError();
    }
    return new ScopedForwardBuilder<S>(source, (identifier, descriptor) => this.addService(identifier, descriptor), this.shadowDepth);
  }
}
