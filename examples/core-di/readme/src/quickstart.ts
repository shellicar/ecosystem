import { createServiceCollection } from '@shellicar/core-di';

abstract class IAbstract {}
class Concrete implements IAbstract {}

const services = createServiceCollection();
services.register(Concrete).as(IAbstract);
const provider = services.buildProvider();

const svc = provider.resolve(IAbstract);
