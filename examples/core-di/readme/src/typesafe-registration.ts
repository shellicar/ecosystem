import { createServiceCollection } from '@shellicar/core-di';

const services = createServiceCollection();

abstract class IAbstract {
  abstract method(): void;
}
abstract class Concrete {}
// @ts-expect-error - Gives an error at build time rather than run time
// Argument of type 'typeof Concrete' is not assignable to parameter of type 'ServiceImplementation<IAbstract>'.
// Cannot assign an abstract constructor type to a non-abstract constructor type.ts(2345)
services.register(IAbstract).to(Concrete);
