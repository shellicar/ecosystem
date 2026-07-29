import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn } from '../src';

abstract class IPer {}
class Per implements IPer {}

abstract class IFirst {
  abstract readonly per: IPer;
}
class First implements IFirst {
  @dependsOn(IPer) public readonly per!: IPer;
}

abstract class ISecond {
  abstract readonly per: IPer;
}
class Second implements ISecond {
  @dependsOn(IPer) public readonly per!: IPer;
}

abstract class ITop {
  abstract readonly per: IPer;
  abstract readonly first: IFirst;
  abstract readonly second: ISecond;
}
class Top implements ITop {
  @dependsOn(IPer) public readonly per!: IPer;
  @dependsOn(IFirst) public readonly first!: IFirst;
  @dependsOn(ISecond) public readonly second!: ISecond;
}

const collection = (eagerSingletons: boolean) => {
  const services = createServiceCollection({ eagerSingletons });
  services.register(Per).as(IPer).resolve();
  services.register(First).as(IFirst).singleton();
  services.register(Second).as(ISecond).singleton();
  services.register(Top).as(ITop).transient();
  return services;
};

// A resolve-lifetime instance is shared within one resolve. A singleton is built once
// and reused forever, so it cannot take part in that sharing: it gets an instance of
// its own, for its own construction. What it holds is then the same whoever resolves
// it, whenever, and whether or not singletons are prebaked.
describe('a resolve-lifetime dependency of a singleton', () => {
  it('is not shared with another singleton built in the same resolve', () => {
    const provider = collection(false).buildProvider();

    const top = provider.resolve(ITop);
    const actual = top.first.per === top.second.per;

    expect(actual).toBe(false);
  });

  it('is not shared with the resolve that triggered the construction', () => {
    const provider = collection(false).buildProvider();

    const top = provider.resolve(ITop);
    const actual = top.per === top.first.per;

    expect(actual).toBe(false);
  });

  it('is not shared with another singleton when singletons are prebaked', () => {
    const provider = collection(true).buildProvider();

    const actual = provider.resolve(IFirst).per === provider.resolve(ISecond).per;

    expect(actual).toBe(false);
  });
});
