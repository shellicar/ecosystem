import { equal } from 'node:assert/strict';
import { createServiceCollection } from '@shellicar/core-di';
import { Concrete, IAbstract } from './helpers/examples';

const services = createServiceCollection();

services.register(IAbstract).to(Concrete).singleton();
const provider = services.buildProvider();
const svc1 = provider.resolve(IAbstract);
const svc2 = provider.resolve(IAbstract);
equal(svc1, svc2);
