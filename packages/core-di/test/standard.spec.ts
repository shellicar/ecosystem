import { equal } from 'node:assert/strict';
import { describe, it } from 'vitest';
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
  services.register(IDependency).to(Dependency);
  services.register(IService).to(Service);

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('can resolve', () => {
    const svc = scoped.resolve(IService);
    equal('got service: hello world', svc.handle());
  });
});
