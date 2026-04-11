import { ok } from 'node:assert/strict';
import { createServiceCollection } from '@shellicar/core-di';

const services = createServiceCollection();

abstract class IAbstract1 {
  abstract test1(): string;
}
abstract class IAbstract2 {
  abstract test2(): string;
}
class Concrete implements IAbstract1, IAbstract2 {
  test1(): string {
    return 'test1';
  }
  test2(): string {
    return 'test2';
  }
}

services.register(IAbstract1, IAbstract2).to(Concrete).singleton();
const provider = services.buildProvider();
const resolved1 = provider.resolve(IAbstract1);
const resolved2 = provider.resolve(IAbstract2);
// @ts-expect-error - typescript doesn't understand that these can be the same
// This comparison appears to be unintentional because the types 'IAbstract1' and 'IAbstract2' have no overlap.ts(2367)
ok(resolved1 === resolved2);
