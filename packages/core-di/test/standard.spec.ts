import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn } from '../src';

abstract class IDependency {
  public abstract check(): string;
}
abstract class IService {
  public abstract handle(): string;
}

class Dependency implements IDependency {
  check(): string {
    return 'hello world';
  }
}

class Service implements IService {
  @dependsOn(IDependency) private readonly dependency!: IDependency;

  handle(): string {
    return `got service: ${this.dependency.check()}`;
  }
}

describe('Standard dependencies', () => {
  const services = createServiceCollection();
  services.register(Dependency).as(IDependency);
  services.register(Service).as(IService);

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('resolves a service with its declared dependency', () => {
    const expected = 'got service: hello world';
    const actual = scoped.resolve(IService).handle();
    expect(actual).toBe(expected);
  });
});
