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
  type ServiceDescriptor,
  type ServiceIdentifier,
  type SourceType,
  ValidationError,
  type ValidationProblem,
  ValidationProblemKind,
  type ValidationReport,
} from '@shellicar/core-di-engine';
import type { IScopedAbstractServiceBuilder, IScopedNewableServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import { IScopedProvider, type IScopedServiceCollection, IServiceProvider as IServiceProviderToken } from '../interfaces';
import type { ILogger } from '../logger';
import type { BuildProviderOptions, InstrumentationHook, InstrumentationOptions, ServiceCollectionOptions, ServiceModuleType } from '../types';
import { ServiceProvider } from './provider';

// Transient is passed like any other verb: the builder no longer appends it. It is
// still the floor at resolution (no feature in the composition caches it).
const composedLifetimes = [Lifetime.Singleton, Lifetime.Scoped, Lifetime.Resolve, Lifetime.Transient] as const satisfies readonly Lifetime[];

const activeHook = (instrument: InstrumentationOptions | undefined): InstrumentationHook | undefined => (instrument?.enabled === true ? instrument.onTiming : undefined);

// Implements the wider, shadow-capable interface: one class serves both the root
// collection and every scope's collection. A caller holding it through IServiceProvider
// (root) or IServiceCollection sees the narrower surface with no .shadow(); a caller
// holding it through IScopedProvider sees IScopedServiceCollection, .shadow() included.
// Runtime shadow support still gates on isScoped, via createCollection's own options.
export class ServiceCollection implements IScopedServiceCollection {
  private readonly composed: ComposableCollection<Lifetime, boolean>;
  private version = 0;
  private built = false;

  constructor(
    private readonly logger: ILogger,
    public readonly options: ServiceCollectionOptions,
    private readonly isScoped: boolean,
    private readonly isAsync: boolean,
  ) {
    this.composed = createCollection(composedLifetimes, {
      async: this.isAsync,
      scoped: this.isScoped,
      onFace: (identifier, descriptor) => {
        this.logger.info('Adding service', { identifier: identifier.name, descriptor });
        this.version++;
      },
    });
  }

  private get services(): DescriptorMap {
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

  public register<T extends SourceType>(implementation: Newable<T>): IScopedNewableServiceBuilder<T>;
  public register<T extends SourceType>(implementation: AbstractNewable<T>): IScopedAbstractServiceBuilder<T>;
  public register<T extends SourceType>(implementation: AbstractNewable<T>): IScopedNewableServiceBuilder<T> | IScopedAbstractServiceBuilder<T> {
    return this.composed.register(implementation as Newable<T>) as IScopedNewableServiceBuilder<T>;
  }

  public forward<S extends SourceType>(source: ServiceIdentifier<S>): IScopedForwardBuilder<S> {
    if (source == null) {
      throw new InvalidServiceIdentifierError();
    }
    return new ForwardBuilder<S>(
      source,
      (identifier, descriptor) => {
        pushBucket(this.services, identifier, descriptor);
        this.logger.info('Adding service', { identifier: identifier.name, descriptor });
        this.version++;
      },
      this.isScoped,
    );
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
  // descriptor itself so scope overlays see the same nodes.
  private cloneWith(isScoped: boolean, copyOf: (descriptor: ServiceDescriptor<SourceType>) => ServiceDescriptor<SourceType>): ServiceCollection {
    const cloned = new ServiceCollection(this.logger, this.options, isScoped, this.isAsync);
    for (const [key, descriptors] of this.services) {
      cloned.services.set(key, descriptors.map(copyOf));
    }
    return cloned;
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
    return this.cloneWith(scoped === true, copyOf);
  }

  public cloneShared(): ServiceCollection {
    return this.cloneWith(true, (descriptor) => descriptor);
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

  private finish(frozen: ServiceCollection, engine: Parameters<typeof ServiceProvider.createRoot>[2], onTiming: InstrumentationHook | undefined, start: number | undefined): IServiceProvider {
    const provider = ServiceProvider.createRoot(this.logger, frozen, engine, onTiming);
    if (start !== undefined) {
      onTiming?.({ kind: 'build', durationMs: performance.now() - start });
    }
    return provider;
  }

  public buildProvider(options?: BuildProviderOptions): IServiceProvider {
    const onTiming = activeHook(options?.instrument);
    const start = onTiming === undefined ? undefined : performance.now();
    const frozen = this.freeze(options);
    const engine = buildEngine(frozen.services, this.composition(), this.engineOptions(options));
    return this.finish(frozen, engine, onTiming, start);
  }

  public async buildProviderAsync(options?: BuildProviderOptions): Promise<IServiceProvider> {
    const onTiming = activeHook(options?.instrument);
    const start = onTiming === undefined ? undefined : performance.now();
    const frozen = this.freeze(options);
    const engine = await buildEngineAsync(frozen.services, this.composition(), this.engineOptions(options));
    return this.finish(frozen, engine, onTiming, start);
  }
}
