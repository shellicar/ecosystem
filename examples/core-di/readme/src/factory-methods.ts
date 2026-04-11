import { createServiceCollection } from '@shellicar/core-di';
import { IRedisOptions, Redis } from './helpers/examples';

const services = createServiceCollection();

services.register(Redis).to(Redis, (x) => {
  const options = x.resolve(IRedisOptions);
  return new Redis({
    port: options.port,
    host: options.host,
  });
});
