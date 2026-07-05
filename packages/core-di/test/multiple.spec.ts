import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IScopedProvider } from '../src';

abstract class ICheckHealth {
  abstract check(): Promise<boolean>;
}

class HealthCheck1 implements ICheckHealth {
  check(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
class HealthCheck2 implements ICheckHealth {
  check(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class CheckAllHealth {
  @dependsOn(IScopedProvider) scope!: IScopedProvider;

  async health() {
    const all = this.scope.resolveAll(ICheckHealth);
    const results = await Promise.all(all.map((x) => x.check()));
    return {
      healthy: results.every((x) => x),
      count: all.length,
    };
  }
}

describe('No implementations', () => {
  it('resolveAll returns an empty array', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();

    const actual = provider.resolveAll(ICheckHealth).length;

    expect(actual).toBe(0);
  });
});

describe('Multiple implementations', () => {
  const services = createServiceCollection();
  services.register(HealthCheck1).as(ICheckHealth).singleton();
  services.register(HealthCheck2).as(ICheckHealth).singleton();
  services.register(CheckAllHealth).asSelf();

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('resolveAll returns every registration for the face', () => {
    const actual = scoped.resolveAll(ICheckHealth).length;
    expect(actual).toBe(2);
  });

  it('reports healthy across all implementations', async () => {
    const svc = scoped.resolve(CheckAllHealth);
    const actual = (await svc.health()).healthy;
    expect(actual).toBe(true);
  });

  it('counts all implementations', async () => {
    const svc = scoped.resolve(CheckAllHealth);
    const actual = (await svc.health()).count;
    expect(actual).toBe(2);
  });
});
