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

// Problem 1: sharing one instance across several tokens, factory or not.
// Sharing is stated by declaring several faces on one register call. The
// factory lives in its own slot and no longer decides identity, so the same
// register call shares whether or not a factory builds the instance.
describe('Shared identity across faces', () => {
  describe('faces on one register call, no factory', () => {
    const services = createServiceCollection();
    services.register(SharedImpl).as(IServiceA).as(IServiceB).singleton();
    const provider = services.buildProvider();

    it('resolves both faces to the same instance', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      expect(actual).toBe(expected);
    });
  });

  describe('faces on one register call, factory-built', () => {
    const services = createServiceCollection();
    services
      .register(SharedImpl)
      .using(() => new SharedImpl('shared'))
      .as(IServiceA)
      .as(IServiceB)
      .singleton();
    const provider = services.buildProvider();

    it('resolves both faces to the same instance', () => {
      const expected = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      expect(actual).toBe(expected);
    });
  });

  // Sharing is local to one register call: separate calls are separate
  // instances, even for the same implementation class. This deliberately
  // replaces the old cache-key behaviour, where two separate register().to()
  // calls for the same class shared one instance.
  describe('separate register calls', () => {
    const services = createServiceCollection();
    services.register(SharedImpl).as(IServiceA).singleton();
    services.register(SharedImpl).as(IServiceB).singleton();
    const provider = services.buildProvider();

    it('resolve to separate instances', () => {
      const first = provider.resolve(IServiceA);
      const actual = provider.resolve(IServiceB);
      expect(actual).not.toBe(first);
    });
  });
});
