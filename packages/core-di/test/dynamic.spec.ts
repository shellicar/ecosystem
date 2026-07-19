import { describe, expect, it } from 'vitest';
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

describe('Factory that invokes the constructor', () => {
  const services = createServiceCollection();
  services.register(Bottom).as(IBottom);
  services
    .register(Top)
    .using((x) => new Top(x.resolve(IBottom)))
    .as(ITop);

  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('injects the constructor dependency', () => {
    const actual = scoped.resolve(ITop).bottom2;
    expect(actual).not.toBeUndefined();
  });

  it('injects the declared field dependency', () => {
    const actual = scoped.resolve(ITop).bottom1;
    expect(actual).not.toBeUndefined();
  });

  it('shares one Bottom across constructor and field within a resolve', () => {
    const svc = scoped.resolve(ITop);
    const expected = svc.bottom2;
    const actual = svc.bottom1;
    expect(actual).toBe(expected);
  });
});
