import { createServiceCollection } from '@shellicar/core-di';

const services = createServiceCollection();

import { deepEqual } from 'node:assert/strict';
import { HealthCheck1, HealthCheck2, IHealthCheck } from './helpers/examples.js';

services.register(HealthCheck1).as(IHealthCheck);
services.register(HealthCheck2).as(IHealthCheck);
const provider = services.buildProvider();
const healthChecks = provider.resolveAll(IHealthCheck);
const promises = healthChecks.map((x) => x.healthy());
const results = await Promise.all(promises);

deepEqual(results, [true, false]);
