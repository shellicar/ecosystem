import { createServiceCollection } from '@shellicar/core-di';
import { Concrete, IAbstract } from './helpers/examples';

const services = createServiceCollection();

const test = (_: IAbstract) => {};

services.register(Concrete).as(IAbstract);
const provider = services.buildProvider();
const svc = provider.resolve(IAbstract);
test(svc);
