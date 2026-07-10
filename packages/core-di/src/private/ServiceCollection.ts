import { Lifetime, ValidationProblemKind } from '../enums';
import { InvalidImplementationError, InvalidServiceIdentifierError, ValidationError } from '../errors';
import type { IAbstractServiceBuilder, IForwardBuilder, INewableServiceBuilder, IServiceCollection, IServiceProvider } from '../interfaces';
import type { ILogger } from '../logger';
import { type AbstractNewable, type BuildProviderOptions, createDescriptorMap, type DescriptorMap, type Newable, type ServiceCollectionOptions, type ServiceDescriptor, type ServiceIdentifier, type ServiceImplementation, type ServiceModuleType, type SourceType, type ValidationProblem, type ValidationReport } from '../types';
import { ForwardBuilder } from './ForwardBuilder';
import { deriveFacts } from './graph';
import { captivePolicyFor, cyclePolicy, missingTargetPolicy, runGraphPolicies } from './policies';
import { ServiceBuilder } from './ServiceBuilder';
import { ServiceProvider } from './ServiceProvider';

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
   * Runs the wiring diagnostics. `NoIdentity` is collection-level (a register()
   * call that never declared a face never enters the graph at all — it is only
   * visible through the builder it handed out). The other three kinds are
   * composed graph policies over the static edges (decisions.md §8) — no
   * probe-construction, the graph module derives the facts with zero
   * construction. Reports problems without throwing.
   */
  public validate(): ValidationReport {
    const problems: ValidationProblem[] = [];
    this.collectNoIdentity(problems);
    const graph = deriveFacts(this.services);
    problems.push(...runGraphPolicies(graph, [missingTargetPolicy, cyclePolicy, captivePolicyFor[this.options.captivePolicy]]));
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
