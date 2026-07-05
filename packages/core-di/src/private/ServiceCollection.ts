import { Lifetime, ValidationProblemKind } from '../enums';
import { InvalidImplementationError, InvalidServiceIdentifierError, ValidationError } from '../errors';
import type { IAbstractServiceBuilder, IForwardBuilder, INewableServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import type { ILogger } from '../logger';
import { type AbstractNewable, type BuildProviderOptions, createDescriptorMap, type DescriptorMap, type Newable, type ServiceCollectionOptions, type ServiceDescriptor, type ServiceIdentifier, type ServiceImplementation, type ServiceModuleType, type SourceType, type ValidationProblem, type ValidationReport } from '../types';
import { DesignDependenciesKey } from './constants';
import { ForwardBuilder } from './ForwardBuilder';
import { getMetadata } from './metadata';
import { ServiceBuilder } from './ServiceBuilder';
import { ServiceProvider } from './ServiceProvider';

/** One node of the dependency graph `validate()` derives by probe-construction. */
type DependencyNode = {
  readonly lifetime: Lifetime;
  readonly deps: ServiceIdentifier<SourceType>[];
};

export class ServiceCollection implements IServiceCollection {
  private readonly builders: ServiceBuilder<SourceType>[] = [];

  constructor(
    private readonly logger: ILogger,
    public readonly options: ServiceCollectionOptions,
    private readonly isScoped: boolean,
    private readonly services = createDescriptorMap(),
  ) {}

  public registerModules(...modules: ServiceModuleType[]): void {
    for (const x of modules) {
      const module = new x();
      module.registerServices(this);
    }
  }

  get<T extends SourceType>(key: ServiceIdentifier<T>): ServiceDescriptor<T>[] {
    return this.services.get(key) ?? [];
  }

  public overrideLifetime<T extends SourceType>(identifier: ServiceIdentifier<T>, lifetime: Lifetime): void {
    for (const descriptor of this.get(identifier)) {
      if (descriptor.forwardTarget == null) {
        descriptor.lifetime = lifetime;
      }
    }
  }

  public register<T extends SourceType>(implementation: Newable<T>): INewableServiceBuilder<T>;
  public register<T extends SourceType>(implementation: AbstractNewable<T>): IAbstractServiceBuilder<T>;
  public register<T extends SourceType>(implementation: AbstractNewable<T>): INewableServiceBuilder<T> | IAbstractServiceBuilder<T> {
    if (implementation == null) {
      throw new InvalidImplementationError<T>(undefined);
    }

    const builder = new ServiceBuilder<T>(implementation as ServiceImplementation<T>, this.isScoped, (identifier, descriptor) => this.addService(identifier, descriptor));
    this.builders.push(builder as ServiceBuilder<SourceType>);
    return builder;
  }

  public forward<S extends SourceType>(source: ServiceIdentifier<S>): IForwardBuilder<S> {
    if (source == null) {
      throw new InvalidServiceIdentifierError();
    }

    return new ForwardBuilder<S>(source, (identifier, descriptor) => this.addService(identifier, descriptor));
  }

  /**
   * Runs the wiring diagnostics. `NoIdentity` and `MissingTarget` are static;
   * `Cycle` and `CaptiveDependency` need the `@dependsOn` graph, which is only
   * recorded at construction, so they are derived by probe-construction (see
   * {@link buildDependencyGraph}). Reports problems without throwing.
   */
  public validate(): ValidationReport {
    const problems: ValidationProblem[] = [];
    this.collectNoIdentity(problems);
    this.collectMissingTarget(problems);
    const graph = this.buildDependencyGraph();
    this.collectCaptiveDependencies(graph, problems);
    this.collectCycles(graph, problems);
    return { valid: problems.length === 0, problems };
  }

  // NoIdentity: a register() call that never declared a face adds nothing to the
  // descriptor map, so it is only visible through the builders it handed out.
  private collectNoIdentity(problems: ValidationProblem[]): void {
    for (const builder of this.builders) {
      if (!builder.hasIdentity) {
        problems.push({
          kind: ValidationProblemKind.NoIdentity,
          message: `${builder.registeredImplementation.name} was registered without a declared identity (no .as() or .asSelf())`,
        });
      }
    }
  }

  // MissingTarget: a forward pointing at a token that has no registration.
  private collectMissingTarget(problems: ValidationProblem[]): void {
    for (const [source, descriptors] of this.services) {
      for (const descriptor of descriptors) {
        if (descriptor.forwardTarget != null && this.get(descriptor.forwardTarget).length === 0) {
          problems.push({
            kind: ValidationProblemKind.MissingTarget,
            message: `Forward from ${source.name} targets ${descriptor.forwardTarget.name}, which is not registered`,
          });
        }
      }
    }
  }

  /**
   * Derives the dependency graph by probe-construction. `@dependsOn` records an
   * edge only when an instance is constructed, so each `@dependsOn`-wired class
   * is constructed **once** to harvest its edges. The probe is read and
   * discarded — never cached as a real instance, and no container state is
   * touched. Construction records the edge without resolving it (the field
   * initializer only tags metadata), so a cyclic `@dependsOn` does not loop here.
   *
   * Forwards have no implementation to probe; factory-built (`using()`)
   * registrations have opted out of declarative `@dependsOn` wiring and their
   * factory is opaque user code that must not run at validate time — neither is
   * probed or included in the graph.
   */
  private buildDependencyGraph(): Map<ServiceIdentifier<SourceType>, DependencyNode> {
    const graph = new Map<ServiceIdentifier<SourceType>, DependencyNode>();
    const probed = new Set<object>();
    for (const [identifier, descriptors] of this.services) {
      const descriptor = descriptors[descriptors.length - 1];
      if (descriptor.forwardTarget != null || descriptor.usesFactory) {
        continue;
      }
      const implementation = descriptor.implementation;
      if (!probed.has(implementation)) {
        probed.add(implementation);
        new (implementation as Newable<SourceType>)();
      }
      const dependencies = getMetadata<SourceType>(DesignDependenciesKey, implementation) ?? {};
      graph.set(identifier, { lifetime: descriptor.lifetime, deps: Object.values(dependencies) });
    }
    return graph;
  }

  // CaptiveDependency: a singleton that depends on a shorter-lived scoped service
  // (the singleton would capture and outlive it).
  private collectCaptiveDependencies(graph: Map<ServiceIdentifier<SourceType>, DependencyNode>, problems: ValidationProblem[]): void {
    for (const [identifier, node] of graph) {
      if (node.lifetime !== Lifetime.Singleton) {
        continue;
      }
      for (const dep of node.deps) {
        const depDescriptors = this.get(dep);
        const depDescriptor = depDescriptors[depDescriptors.length - 1];
        if (depDescriptor?.lifetime === Lifetime.Scoped) {
          problems.push({
            kind: ValidationProblemKind.CaptiveDependency,
            message: `${identifier.name} (singleton) depends on ${dep.name} (scoped) — a captive dependency`,
          });
        }
      }
    }
  }

  // Cycle: a dependency cycle over the graph. Reports one problem per distinct
  // cycle (deduped by the set of nodes involved).
  private collectCycles(graph: Map<ServiceIdentifier<SourceType>, DependencyNode>, problems: ValidationProblem[]): void {
    const state = new Map<ServiceIdentifier<SourceType>, 'visiting' | 'done'>();
    const stack: ServiceIdentifier<SourceType>[] = [];
    const reported = new Set<string>();

    const visit = (node: ServiceIdentifier<SourceType>): void => {
      state.set(node, 'visiting');
      stack.push(node);
      for (const dep of graph.get(node)?.deps ?? []) {
        if (!graph.has(dep)) {
          continue;
        }
        const depState = state.get(dep);
        if (depState === 'visiting') {
          const cycle = stack.slice(stack.indexOf(dep));
          const signature = cycle
            .map((n) => n.name)
            .sort()
            .join('|');
          if (!reported.has(signature)) {
            reported.add(signature);
            problems.push({
              kind: ValidationProblemKind.Cycle,
              message: `Dependency cycle: ${cycle.map((n) => n.name).join(' -> ')} -> ${dep.name}`,
            });
          }
        } else if (depState === undefined) {
          visit(dep);
        }
      }
      stack.pop();
      state.set(node, 'done');
    };

    for (const node of graph.keys()) {
      if (!state.has(node)) {
        visit(node);
      }
    }
  }

  private addService<T extends SourceType>(identifier: ServiceIdentifier<T>, descriptor: ServiceDescriptor<T>) {
    this.logger.info('Adding service', { identifier: identifier.name, descriptor });
    let existing = this.services.get(identifier);
    if (existing == null) {
      existing = [];
      this.services.set(identifier, existing);
    }
    existing.push(descriptor);
  }

  public clone(scoped?: unknown): IServiceCollection {
    const clonedMap: DescriptorMap = createDescriptorMap();
    for (const [key, descriptors] of this.services) {
      const clonedDescriptors = descriptors.map((descriptor) => ({ ...descriptor }));
      clonedMap.set(key, clonedDescriptors);
    }

    return new ServiceCollection(this.logger, this.options, scoped === true, clonedMap);
  }

  public buildProvider(options?: BuildProviderOptions): IServiceProvider {
    if (options?.validate) {
      const report = this.validate();
      if (!report.valid) {
        throw new ValidationError(report.problems);
      }
    }
    return ServiceProvider.createRoot(this.logger, this.clone());
  }
}
