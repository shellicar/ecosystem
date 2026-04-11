import { ok } from 'node:assert/strict';
import { createServiceCollection, Lifetime, LogLevel } from '@shellicar/core-di';
import { Concrete, IAbstract } from './helpers/examples';

const services = createServiceCollection({ logLevel: LogLevel.Debug });
services.register(IAbstract).to(Concrete).singleton();
const provider = services.buildProvider();
provider.Services.overrideLifetime(IAbstract, Lifetime.Transient);
const svc1 = provider.resolve(IAbstract);
const svc2 = provider.resolve(IAbstract);
ok(svc1 !== svc2);
