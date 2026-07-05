import { createServiceCollection } from '../src';

abstract class IAbstract {
  abstract method(): void;
}
class Concrete {}

const services = createServiceCollection();
services
  .register(Concrete)
  // @ts-expect-error: Concrete does not implement IAbstract (missing method()).
  .as(IAbstract);
