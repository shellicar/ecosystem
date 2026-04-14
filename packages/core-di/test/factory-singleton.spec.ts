import { equal, notEqual } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IServiceA {
  abstract value(): string;
}
abstract class IServiceB {
  abstract value(): string;
}
abstract class IServiceC {
  abstract value(): string;
}

class SharedImpl implements IServiceA, IServiceB, IServiceC {
  constructor(private readonly label: string = 'default') {}
  value(): string {
    return this.label;
  }
}

describe('Factory singleton identity', () => {
  describe('without factory', () => {
    const services = createServiceCollection();
    services.register(IServiceA).to(SharedImpl).singleton();
    services.register(IServiceB).to(SharedImpl).singleton();
    const provider = services.buildProvider();

    it('same implementation class resolves to the same instance', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      equal(actual, expected);
    });
  });

  describe('with the same factory', () => {
    const factory = () => new SharedImpl('shared');

    const services = createServiceCollection();
    services.register(IServiceA).to(SharedImpl, factory).singleton();
    services.register(IServiceB).to(SharedImpl, factory).singleton();
    const provider = services.buildProvider();

    it('same factory reference resolves to the same instance', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      equal(actual, expected);
    });
  });

  describe('with different factories', () => {
    const services = createServiceCollection();
    services
      .register(IServiceA)
      .to(SharedImpl, () => new SharedImpl('a'))
      .singleton();
    services
      .register(IServiceB)
      .to(SharedImpl, () => new SharedImpl('b'))
      .singleton();
    const provider = services.buildProvider();

    it('different factories resolve to different instances', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      notEqual(actual, expected);
    });

    it('each interface consistently returns its own instance', () => {
      const expectedA = provider.resolve(IServiceA);
      const actualA = provider.resolve(IServiceA);
      equal(actualA, expectedA);

      const expectedB = provider.resolve(IServiceB);
      const actualB = provider.resolve(IServiceB);
      equal(actualB, expectedB);

      notEqual(expectedA, expectedB);
    });
  });

  describe('mixed factory and no factory', () => {
    const services = createServiceCollection();
    services.register(IServiceA).to(SharedImpl).singleton();
    services
      .register(IServiceB)
      .to(SharedImpl, () => new SharedImpl('factory'))
      .singleton();
    const provider = services.buildProvider();

    it('factory and non-factory resolve to different instances', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      notEqual(actual, expected);
    });
  });
});
