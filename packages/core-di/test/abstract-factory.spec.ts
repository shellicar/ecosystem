import { equal, ok } from 'node:assert/strict';
import { describe, it } from 'vitest';
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

describe('Can register abstract with factory', () => {
  let created = false;

  const services = createServiceCollection();
  services.register(ITimeProvider).to(FakeTimeProvider);
  services.register(IClock).to(Clock, (x) => {
    created = true;
    const provider = x.resolve(ITimeProvider);
    return new Clock(provider);
  });

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('will use factory', () => {
    scoped.resolve(IClock);
    ok(created);
  });

  it('will use dependency', () => {
    const clock = scoped.resolve(IClock);
    equal('2024-12-30T01:02:03.456Z', clock.isoString());
  });
});
