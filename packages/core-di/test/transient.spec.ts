import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IAbstract {}
class Concrete implements IAbstract {}

describe('Transient lifetime', () => {
  const services = createServiceCollection();
  services.register(Concrete).as(IAbstract).transient();
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('builds a new instance on every resolve', () => {
    const first = scoped.resolve(IAbstract);
    const actual = scoped.resolve(IAbstract);
    expect(actual).not.toBe(first);
  });

  it('builds a new instance across root and scope', () => {
    const first = provider.resolve(IAbstract);
    const actual = scoped.resolve(IAbstract);
    expect(actual).not.toBe(first);
  });
});
