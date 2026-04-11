import { createServiceCollection } from '@shellicar/core-di';

const services = createServiceCollection();

export const provider = services.buildProvider();
