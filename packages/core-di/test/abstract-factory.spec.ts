import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IClock {
  abstract isoString(): string;
}
class Clock implements IClock {
  constructor(private readonly provider: ITimeProvider) {}

  isoString(): string {
    const date = this.provider.time();
    return date.toISOString();
  }
}

abstract class ITimeProvider {
  abstract time(): Date;
}
class FakeTimeProvider implements ITimeProvider {
  time(): Date {
    return new Date(Date.UTC(2024, 11, 30, 1, 2, 3, 456));
  }
}

describe('Register with a factory in its own slot', () => {
  let created = false;

  const services = createServiceCollection();
  services.register(FakeTimeProvider).as(ITimeProvider);
  services
    .register(Clock)
    .using((x) => {
      created = true;
      return new Clock(x.resolve(ITimeProvider));
    })
    .as(IClock);

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('runs the factory to build the instance', () => {
    scoped.resolve(IClock);
    expect(created).toBe(true);
  });

  it('resolves the factory dependency', () => {
    const expected = '2024-12-30T01:02:03.456Z';
    const actual = scoped.resolve(IClock).isoString();
    expect(actual).toBe(expected);
  });
});
