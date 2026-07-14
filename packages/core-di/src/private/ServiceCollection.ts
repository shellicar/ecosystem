import { Lifetime, ValidationProblemKind } from '../enums';
import { InvalidOperationError, InvalidServiceIdentifierError, ValidationError } from '../errors';
import type { IAbstractServiceBuilder, IForwardBuilder, INewableServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import { IResolutionScope, IScopedProvider, IServiceProvider as IServiceProviderToken } from '../interfaces';
import type { ILogger } from '../logger';
import type { AbstractNewable, BuildProviderOptions, DescriptorMap, Newable, ServiceCollectionOptions, ServiceDescriptor, ServiceIdentifier, ServiceModuleType, SourceType, ValidationProblem, ValidationReport } from '../types';
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

/** The full composed lifetime set of the main `core-di` surface (the lite seam composes fewer; decisions.md §8). */
const composedLifetimes = [Lifetime.Singleton, Lifetime.Scoped, Lifetime.Resolve] as const satisfies readonly ComposableLifetime[];

/**
 * The public collection: a shell over the composed register layer
 * (`createCollection`, decisions.md §8) that adds what the public surface owns —
 * forwards, modules, validation, cloning, and the build boundary that renders
 * the registrations into the boundary engine. The registrations live in the
 * composed collection's `regs`, which IS the `DescriptorMap` the engine
 * consumes: one registration model end to end.
 */
export class ServiceCollection implements IServiceCollection {
  private readonly composed: ComposableCollection<ComposableLifetime, boolean>;
  /** Bumped on every registration — the engine's per-scope view reads it to know its plans are stale. */
  private version = 0;
  /** Set by the first `buildProvider` — `overrideLifetime` is pre-build only (v5). */
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

  /** The registrations, as the map the graph and engine consume. */
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
    // Pre-build only (v5, decided): a provider's plans and pre-baked singletons
    // are derived at build, so a lifetime rewrite after buildProvider() could not
    // reach them — it would silently disagree with the running engine.
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

  /**
   * Runs the wiring diagnostics. `NoIdentity` is collection-level (a register()
   * call that never declared a face never enters the graph at all — it is only
   * visible through the composed collection). The other kinds are composed
   * graph policies over the static edges (decisions.md §8) — no
   * probe-construction, the graph module derives the facts with zero
   * construction. Reports problems without throwing.
   */
  public validate(): ValidationReport {
    const problems: ValidationProblem[] = [];
    for (const node of this.composed.unfaced()) {
      problems.push({
        kind: ValidationProblemKind.NoIdentity,
        message: `${node.implementation.name} was registered without a declared identity (no .as() or .asSelf())`,
      });
    }
    const graph = deriveFacts(this.services);
    // The composed default lifetime for an un-verbed registration is Lifetime.Resolve
    // (the main surface's composition() default) — the captive check judges deps by
    // that effective lifetime (C1).
    problems.push(...runGraphPolicies(graph, [missingTargetPolicy, cyclePolicy, asyncThroughSyncPathPolicy, captivePolicyFor(this.options.captivePolicy, Lifetime.Resolve)]));
    return { valid: problems.length === 0, problems };
  }

  public clone(scoped?: unknown): IServiceCollection {
    const cloned = new ServiceCollection(this.logger, this.options, scoped === true, this.isAsync);
    // Identity-preserving copy: every face of one register() call points at ONE
    // shared node, and node identity is what shares the cached instance across
    // faces — so each distinct descriptor is copied exactly once, and tokens
    // that shared a node keep sharing the copy.
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

  /**
   * The scope-collection clone (dynamic scope registration, decisions.md §7):
   * shares the descriptor *objects* — node identity is what lets a scope's
   * engine view share every feature cache and held error with the root — while
   * fresh arrays keep the scope's own registrations from leaking to the parent.
   */
  public cloneShared(): ServiceCollection {
    const cloned = new ServiceCollection(this.logger, this.options, true, this.isAsync);
    for (const [key, descriptors] of this.services) {
      cloned.services.set(key, [...descriptors]);
    }
    return cloned;
  }

  /** The live registration state the engine's per-scope view reads (see {@link ServiceProvider.createScope}). */
  public snapshot(): { readonly services: DescriptorMap; readonly version: number } {
    return { services: this.services, version: this.version };
  }

  /**
   * The engine composition of the main surface: all three lifetime features,
   * the floor's default of `Lifetime.Resolve` for un-verbed registrations
   * (supplied by the engine, never stamped by the register layer), the
   * disposal tracker, and the three self-tokens mapped to their surfaces.
   */
  private composition() {
    return {
      singleton: createSingletonLifetime(),
      scoped: createScopedLifetime(),
      resolve: createResolveLifetime(),
      defaultLifetime: Lifetime.Resolve,
      disposal: createDisposal(),
      captivePolicy: this.options.captivePolicy,
      surfaceTokens: new Map<ServiceIdentifier<SourceType>, 'root' | 'boundary'>([
        [IServiceProviderToken as ServiceIdentifier<SourceType>, 'root'],
        [IScopedProvider as ServiceIdentifier<SourceType>, 'boundary'],
        [IResolutionScope as ServiceIdentifier<SourceType>, 'boundary'],
      ]),
    };
  }

  /** Freeze the registrations for a build: later registrations must not reach a provider already built. */
  private freeze(options?: BuildProviderOptions): ServiceCollection {
    if (options?.validate) {
      const report = this.validate();
      if (!report.valid) {
        throw new ValidationError(report.problems);
      }
    }
    this.built = true;
    const frozen = this.clone() as ServiceCollection;
    // The frozen clone is the provider's own collection — already built by
    // definition, so overrideLifetime through provider.Services throws too.
    frozen.built = true;
    return frozen;
  }

  public buildProvider(options?: BuildProviderOptions): IServiceProvider {
    const frozen = this.freeze(options);
    const engine = buildEngine(frozen.services, this.composition(), {
      validate: options?.validate,
      registrationMode: this.options.registrationMode,
    });
    return ServiceProvider.createRoot(this.logger, frozen, engine);
  }

  /**
   * The async build boundary (decisions.md §8) — exposed on the type surface
   * only for a collection created with `{ async: true }`. Awaits async
   * singleton factories (`usingAsync`) in topological order, so their
   * instances are settled and every later `resolve()` is synchronous.
   */
  public async buildProviderAsync(options?: BuildProviderOptions): Promise<IServiceProvider> {
    const frozen = this.freeze(options);
    const engine = await buildEngineAsync(frozen.services, this.composition(), {
      validate: options?.validate,
      registrationMode: this.options.registrationMode,
    });
    return ServiceProvider.createRoot(this.logger, frozen, engine);
  }
}
