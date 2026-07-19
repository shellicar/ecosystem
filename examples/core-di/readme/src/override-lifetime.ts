import { ok } from 'node:assert/strict';
import { createServiceCollection, Lifetime, LogLevel } from '@shellicar/core-di';
import { Concrete, IAbstract } from './helpers/examples.js';

const services = createServiceCollection({ logLevel: LogLevel.Debug });
services.register(Concrete).as(IAbstract).singleton();
// overrideLifetime is pre-build only: the provider derives its plans at
// buildProvider(), so override before building (it throws afterwards).
services.overrideLifetime(IAbstract, Lifetime.Transient);
const provider = services.buildProvider();
const svc1 = provider.resolve(IAbstract);
const svc2 = provider.resolve(IAbstract);
ok(svc1 !== svc2);
