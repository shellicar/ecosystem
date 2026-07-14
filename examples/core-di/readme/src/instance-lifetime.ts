import { equal } from 'node:assert/strict';
import { createServiceCollection } from '@shellicar/core-di';
import { Concrete, IAbstract } from './helpers/examples.js';

const services = createServiceCollection();

services.register(Concrete).as(IAbstract).singleton();
const provider = services.buildProvider();
const svc1 = provider.resolve(IAbstract);
const svc2 = provider.resolve(IAbstract);
equal(svc1, svc2);
