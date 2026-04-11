import { createServiceCollection } from '@shellicar/core-di';

const services = createServiceCollection();

import { deepEqual } from 'node:assert/strict';
import { HealthCheck1, HealthCheck2, IHealthCheck } from './helpers/examples';

services.register(IHealthCheck).to(HealthCheck1);
services.register(IHealthCheck).to(HealthCheck2);
const provider = services.buildProvider();
const healthChecks = provider.resolveAll(IHealthCheck);
const promises = healthChecks.map((x) => x.healthy());
const results = await Promise.all(promises);

deepEqual(results, [true, false]);
