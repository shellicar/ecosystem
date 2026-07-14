import { Lifetime, ValidationProblemKind } from '../enums';
import { InvalidOperationError, InvalidServiceIdentifierError, ValidationError } from '../errors';
import type { IAbstractServiceBuilder, IForwardBuilder, INewableServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import { IResolutionScope, IScopedProvider, IServiceProvider as IServiceProviderToken } from '../interfaces';
import type { ILogger } from '../logger';
import type { AbstractNewable, BuildProviderOptions, DescriptorMap, InstrumentationHook, InstrumentationOptions, Newable, ServiceCollectionOptions, ServiceDescriptor, ServiceIdentifier, ServiceModuleType, SourceType, ValidationProblem, ValidationReport } from '../types';
import { buildEngine, buildEngineAsync } from './boundaryEngine';
import { type ComposableCollection, type ComposableLifetime, createCollection } from './composableBuilder';
import { createDisposal } from './disposal';
import { ForwardBuilder } from './ForwardBuilder';
import { deriveFacts } from './graph';
import { createResolveLifetime } from './lifetimeResolve';
import { createScopedLifetime } from './lifetimeScoped';
import { createSingletonLifetime } from './lifetimeSingleton';
import { asyncThroughSyncPathPolicy, captivePolicyFor, cyclePolicy, missingTargetPolicy, runGraphPolicies } from './policies';
import { ServiceProvider } from './provider';

const composedLifetimes = [Lifetime.Singleton, Lifetime.Scoped, Lifetime.Resolve] as const satisfies readonly ComposableLifetime[];

const activeHook = (instrument: InstrumentationOptions | undefined): InstrumentationHook | undefined => (instrument?.enabled === true ? instrument.onTiming : undefined);

export class ServiceCollection implements IServiceCollection {
  private readonly composed: ComposableCollection<ComposableLifetime, boolean>;
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
      throw new InvalidOperationError('overrideLifetime is pre-build only: the provider derives its plans at buildProvider(), so a lifetime cannot be overridden afterwards. Override before building.');
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

  public forward<S extends SourceType>(source: ServiceIdentifier<S>): IForwardBuilder<S> {
    if (source == null) {
      throw new InvalidServiceIdentifierError();
    }
    return new ForwardBuilder<S>(source, (identifier, descriptor) => {
      const bucket = this.services.get(identifier);
      if (bucket === undefined) {
        this.services.set(identifier, [descriptor]);
      } else {
        bucket.push(descriptor);
      }
      this.logger.info('Adding service', { identifier: identifier.name, descriptor });
      this.version++;
    });
  }

  public validate(): ValidationReport {
    const problems: ValidationProblem[] = [];
    for (const node of this.composed.unfaced()) {
      problems.push({
        kind: ValidationProblemKind.NoIdentity,
        message: `${node.implementation.name} was registered without a declared identity (no .as() or .asSelf())`,
      });
    }
    const graph = deriveFacts(this.services);
    problems.push(...runGraphPolicies(graph, [missingTargetPolicy, cyclePolicy, asyncThroughSyncPathPolicy, captivePolicyFor(this.options.captivePolicy, Lifetime.Resolve)]));
    return { valid: problems.length === 0, problems };
  }

  public clone(scoped?: unknown): IServiceCollection {
    const cloned = new ServiceCollection(this.logger, this.options, scoped === true, this.isAsync);
    const copies = new Map<ServiceDescriptor<SourceType>, ServiceDescriptor<SourceType>>();
    const copyOf = (descriptor: ServiceDescriptor<SourceType>): ServiceDescriptor<SourceType> => {
      let copy = copies.get(descriptor);
      if (copy === undefined) {
        copy = { ...descriptor };
        copies.set(descriptor, copy);
      }
      return copy;
    };
    for (const [key, descriptors] of this.services) {
      cloned.services.set(key, descriptors.map(copyOf));
    }
    return cloned;
  }

  public cloneShared(): ServiceCollection {
    const cloned = new ServiceCollection(this.logger, this.options, true, this.isAsync);
    for (const [key, descriptors] of this.services) {
      cloned.services.set(key, [...descriptors]);
    }
    return cloned;
  }

  public snapshot(): { readonly services: DescriptorMap; readonly version: number } {
    return { services: this.services, version: this.version };
  }

  private composition() {
    return {
      singleton: createSingletonLifetime(),
      scoped: createScopedLifetime(),
      resolve: createResolveLifetime(),
      defaultLifetime: Lifetime.Resolve,
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
    return frozen;
  }

  public buildProvider(options?: BuildProviderOptions): IServiceProvider {
    const onTiming = activeHook(options?.instrument);
    const build = (): IServiceProvider => {
      const frozen = this.freeze(options);
      const engine = buildEngine(frozen.services, this.composition(), {
        validate: options?.validate,
        registrationMode: this.options.registrationMode,
      });
      return ServiceProvider.createRoot(this.logger, frozen, engine, onTiming);
    };
    if (onTiming === undefined) {
      return build();
    }
    const start = performance.now();
    const provider = build();
    onTiming({ kind: 'build', durationMs: performance.now() - start });
    return provider;
  }

  public async buildProviderAsync(options?: BuildProviderOptions): Promise<IServiceProvider> {
    const onTiming = activeHook(options?.instrument);
    const build = async (): Promise<IServiceProvider> => {
      const frozen = this.freeze(options);
      const engine = await buildEngineAsync(frozen.services, this.composition(), {
        validate: options?.validate,
        registrationMode: this.options.registrationMode,
      });
      return ServiceProvider.createRoot(this.logger, frozen, engine, onTiming);
    };
    if (onTiming === undefined) {
      return build();
    }
    const start = performance.now();
    const provider = await build();
    onTiming({ kind: 'build', durationMs: performance.now() - start });
    return provider;
  }
}
