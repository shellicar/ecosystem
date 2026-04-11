import { equal, notEqual } from 'node:assert/strict';
import { describe, it } from 'vitest';
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
  services.register(IBottom).to(Bottom);
  services.register(IMiddle).to(Middle);
  services.register(ITop).to(Top);
  const provider = services.buildProvider();
  const scoped = provider.createScope();

  it('creates bottom once', () => {
    const svc = scoped.resolve(ITop);
    const bottom1 = svc.middle1.bottom1;
    const bottom2 = svc.middle1.bottom2;
    const bottom3 = svc.middle2.bottom1;
    const bottom4 = svc.middle2.bottom2;
    equal(bottom1, bottom2);
    equal(bottom3, bottom4);
    equal(bottom1, bottom3);
  });

  it('next resolve is different', () => {
    const svc1 = scoped.resolve(ITop);
    const svc2 = scoped.resolve(ITop);
    const bottom1 = svc1.middle1.bottom1;
    const bottom2 = svc2.middle1.bottom1;
    notEqual(bottom1, bottom2);
  });
});
