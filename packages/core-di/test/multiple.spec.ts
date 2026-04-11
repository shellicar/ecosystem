import { equal } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection, dependsOn, IScopedProvider } from '../src';

abstract class ICheckHealth {
  abstract check(): Promise<boolean>;
}

class HealthCheck1 implements ICheckHealth {
  #checked = false;
  public get checked() {
    return this.#checked;
  }

  check(): Promise<boolean> {
    this.#checked = true;
    return Promise.resolve(true);
  }
}
class HealthCheck2 implements ICheckHealth {
  #checked = false;
  public get checked() {
    return this.#checked;
  }
  check(): Promise<boolean> {
    this.#checked = true;
    return Promise.resolve(true);
  }
}

class CheckAllHealth {
  @dependsOn(IScopedProvider) scope!: IScopedProvider;

  async health() {
    const all = this.scope.resolveAll(ICheckHealth);
    const promises = all.map((x) => x.check());
    const results = await Promise.all(promises);
    return {
      healthy: results.every((x) => x),
      count: all.length,
    };
  }
}

describe('No implementations', () => {
  it('doesnt throw', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();
    const result = provider.resolveAll(ICheckHealth);
    equal(0, result.length);
  });
});

describe('Multiple implementations', () => {
  const services = createServiceCollection();
  services.register(ICheckHealth).to(HealthCheck1).singleton();
  services.register(ICheckHealth).to(HealthCheck2).singleton();
  services.register(CheckAllHealth).to(CheckAllHealth);

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('can resolve', async () => {
    const svc = scoped.resolve(CheckAllHealth);
    const result = await svc.health();
    equal(true, result.healthy);
    equal(2, result.count);
  });

  it('resolves both', async () => {
    const health = scoped.resolveAll(ICheckHealth);
    const h1 = health[0] as HealthCheck1;
    const h2 = health[0] as HealthCheck2;
    equal(true, h1.checked);
    equal(true, h2.checked);
  });
});
