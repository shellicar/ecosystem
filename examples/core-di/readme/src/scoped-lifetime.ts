import { createServiceCollection } from '@shellicar/core-di';

const services = createServiceCollection();

const provider = services.buildProvider();
using scope = provider.createScope();
//    ^ using scope: IScopedProvider
