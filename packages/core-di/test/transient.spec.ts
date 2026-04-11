import { notEqual } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IAbstract {}
class Concreate implements IAbstract {}

describe('Transient lifetime', () => {
  const services = createServiceCollection();
  services.register(IAbstract).to(Concreate).transient();
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('created service twice', () => {
    const svc1 = scoped.resolve(IAbstract);
    const svc2 = scoped.resolve(IAbstract);
    notEqual(svc1, svc2);
  });

  it('scoped version is different', () => {
    const svc1 = provider.resolve(IAbstract);
    const svc2 = scoped.resolve(IAbstract);
    notEqual(svc1, svc2);
  });
});
