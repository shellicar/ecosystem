import { Lifetime } from '../enums';
import { createRegistrationMap, type RegistrationMap, type ServiceIdentifier, type ServiceRegistration, type SourceType } from '../types';

export class ResolutionContext {
  constructor(
    private readonly singletons: RegistrationMap,
    private readonly scoped: RegistrationMap,
    public readonly targetIdentifier?: ServiceIdentifier<any>,
  ) {}

  private readonly transient: RegistrationMap = createRegistrationMap();
  private readonly resolving = new Set<ServiceRegistration<SourceType>>();

  public markResolving<T extends SourceType>(implementation: ServiceRegistration<T>): boolean {
    if (this.resolving.has(implementation)) {
      return false;
    }
    this.resolving.add(implementation);
    return true;
  }

  public unmarkResolving<T extends SourceType>(implementation: ServiceRegistration<T>): void {
    this.resolving.delete(implementation);
  }

  public getFromLifetime<T extends SourceType>(implementation: ServiceRegistration<T>, lifetime: Lifetime): T | null {
    const map = this.getMapForLifetime(lifetime);
    return map?.get(implementation);
  }

  public setForLifetime<T extends SourceType>(implementation: ServiceRegistration<T>, instance: T, lifetime: Lifetime): void {
    const map = this.getMapForLifetime(lifetime);
    map?.set(implementation, instance);
  }

  private getMapForLifetime(lifetime: Lifetime) {
    const map: Partial<Record<Lifetime, RegistrationMap>> = {
      [Lifetime.Singleton]: this.singletons,
      [Lifetime.Scoped]: this.scoped,
      [Lifetime.Resolve]: this.transient,
    };
    return map[lifetime];
  }
}
