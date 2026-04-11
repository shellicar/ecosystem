import { createServiceCollection } from '../src';

abstract class IAbstract {
  abstract method(): void;
}
abstract class Concrete {}

const services = createServiceCollection();
// @ts-expect-error: Argument of type 'typeof Concrete' is not assignable to parameter of type 'ServiceImplementation<IAbstract>'.
services.register(IAbstract).to(Concrete);
