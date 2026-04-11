import { equal, notEqual } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection, dependsOn } from '../src';

abstract class IBottom {}
abstract class ITop {
  abstract readonly bottom1: IBottom;
  abstract readonly bottom2: IBottom;
}

class Bottom implements IBottom {}
class Top implements ITop {
  @dependsOn(IBottom) public readonly bottom1!: IBottom;

  constructor(public readonly bottom2: IBottom) {}
}

describe('Works when constructor is invoked', () => {
  const services = createServiceCollection();
  services.register(IBottom).to(Bottom);
  services.register(ITop).to(Top, (x) => new Top(x.resolve(IBottom)));

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('can resolve', () => {
    const svc = scoped.resolve(ITop);
    notEqual(svc.bottom2, undefined);
  });

  it('sets property', () => {
    const svc = scoped.resolve(ITop);
    notEqual(svc.bottom1, undefined);
  });

  it('resolves bottom once', () => {
    const svc = scoped.resolve(ITop);
    equal(svc.bottom1, svc.bottom2);
  });
});
