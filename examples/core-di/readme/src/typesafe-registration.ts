import { createServiceCollection } from '@shellicar/core-di';

const services = createServiceCollection();

abstract class IAbstract {
  abstract method(): void;
}
class Concrete {}
services
  .register(Concrete)
  // @ts-expect-error - Gives an error at build time rather than run time:
  // Concrete does not implement IAbstract (missing method()), so it cannot be registered under that face.
  .as(IAbstract);
