import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IServiceA {
  abstract value(): string;
}
abstract class IServiceB {
  abstract value(): string;
}

class SharedImpl implements IServiceA, IServiceB {
  constructor(private readonly label: string = 'default') {}
  value(): string {
    return this.label;
  }
}

describe('Factory singleton identity', () => {
  describe('without factory', () => {
    const services = createServiceCollection();
    services.register(IServiceA).to(SharedImpl);
    services.register(IServiceB).to(SharedImpl);
    const provider = services.buildProvider();

    it('same implementation class resolves to the same instance', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      expect(actual).toBe(expected);
    });
  });

  describe('with the same factory', () => {
    const factory = () => new SharedImpl('shared');

    const services = createServiceCollection();
    services.register(IServiceA).to(SharedImpl, factory);
    services.register(IServiceB).to(SharedImpl, factory);
    const provider = services.buildProvider();

    it('same factory reference resolves to the same instance', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      expect(actual).toBe(expected);
    });
  });

  describe('with different factories', () => {
    const services = createServiceCollection();
    services.register(IServiceA).to(SharedImpl, () => new SharedImpl('a'));
    services.register(IServiceB).to(SharedImpl, () => new SharedImpl('b'));
    const provider = services.buildProvider();

    it('different factories resolve to different instances', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      expect(actual).not.toBe(expected);
    });

    it('each interface consistently returns its own instance', () => {
      const expectedA = provider.resolve(IServiceA);
      const actualA = provider.resolve(IServiceA);
      expect(actualA).toBe(expectedA);

      const expectedB = provider.resolve(IServiceB);
      const actualB = provider.resolve(IServiceB);
      expect(actualB).toBe(expectedB);

      expect(expectedA).not.toBe(expectedB);
    });
  });

  describe('mixed factory and no factory', () => {
    const services = createServiceCollection();
    services.register(IServiceA).to(SharedImpl);
    services.register(IServiceB).to(SharedImpl, () => new SharedImpl('factory'));
    const provider = services.buildProvider();

    it('factory and non-factory resolve to different instances', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      expect(actual).not.toBe(expected);
    });
  });
});
