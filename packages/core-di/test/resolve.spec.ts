import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn } from '../src';

abstract class IBottom {}
abstract class IMiddle {
  abstract bottom1: IBottom;
  abstract bottom2: IBottom;
}
abstract class ITop {
  abstract middle1: IMiddle;
  abstract middle2: IMiddle;
}

class Bottom implements IBottom {}
class Middle implements IMiddle {
  @dependsOn(IBottom) bottom1!: IBottom;
  @dependsOn(IBottom) bottom2!: IBottom;
}
class Top implements ITop {
  @dependsOn(IMiddle) middle1!: IMiddle;
  @dependsOn(IMiddle) middle2!: IMiddle;
}

describe('Resolve lifetime', () => {
  const services = createServiceCollection();
  services.register(Bottom).as(IBottom);
  services.register(Middle).as(IMiddle);
  services.register(Top).as(ITop);
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('shares one instance across the whole resolution tree', () => {
    const svc = scoped.resolve(ITop);
    const expected = svc.middle1.bottom1;
    const actual = svc.middle2.bottom2;
    expect(actual).toBe(expected);
  });

  it('builds a fresh instance on the next top-level resolve', () => {
    const first = scoped.resolve(ITop).middle1.bottom1;
    const actual = scoped.resolve(ITop).middle1.bottom1;
    expect(actual).not.toBe(first);
  });
});
