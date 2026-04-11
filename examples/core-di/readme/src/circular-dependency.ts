import { CircularDependencyError, createServiceCollection, dependsOn, SelfDependencyError, ServiceError } from '@shellicar/core-di';

// Self-dependency: A depends on itself
abstract class ISelfDep {
  abstract value(): string;
}
class SelfDep implements ISelfDep {
  @dependsOn(ISelfDep) private readonly self!: ISelfDep;
  value(): string {
    return 'self';
  }
}

// Circular dependency: A → B → A
abstract class IServiceA {
  abstract value(): string;
}
abstract class IServiceB {
  abstract value(): string;
}
class ServiceA implements IServiceA {
  @dependsOn(IServiceB) private readonly b!: IServiceB;
  value(): string {
    return 'a';
  }
}
class ServiceB implements IServiceB {
  @dependsOn(IServiceA) private readonly a!: IServiceA;
  value(): string {
    return 'b';
  }
}

// Self-dependency throws SelfDependencyError
{
  const services = createServiceCollection();
  services.register(ISelfDep).to(SelfDep);
  const provider = services.buildProvider();
  try {
    provider.resolve(ISelfDep);
  } catch (err) {
    console.error(err);
    if (err instanceof SelfDependencyError) {
      console.log('Caught self-dependency:', err.message);
    }
  }
}

// Circular dependency throws CircularDependencyError
{
  const services = createServiceCollection();
  services.register(IServiceA).to(ServiceA);
  services.register(IServiceB).to(ServiceB);
  const provider = services.buildProvider();
  try {
    provider.resolve(IServiceA);
  } catch (err) {
    console.error(err);
    if (err instanceof CircularDependencyError) {
      console.log('Caught circular dependency:', err.message);
    }
  }
}

// Both errors extend ServiceError for catch-all handling
{
  const services = createServiceCollection();
  services.register(IServiceA).to(ServiceA);
  services.register(IServiceB).to(ServiceB);
  const provider = services.buildProvider();
  try {
    provider.resolve(IServiceA);
  } catch (err) {
    if (err instanceof ServiceError) {
      console.log('Caught service error:', err.name, err.message);
    }
  }
}
