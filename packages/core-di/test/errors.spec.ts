import { fail, ok, throws } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection, ResolveMultipleMode } from '../src';
import { MultipleRegistrationError, ServiceError, UnregisteredServiceError } from '../src/errors';

abstract class IService {}
class Service implements IService {}
class OtherService implements IService {}

describe('errors', () => {
  it('Unregistered', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();
    throws(() => provider.resolve(IService), UnregisteredServiceError);
  });

  it('Multiple registrations', () => {
    const services = createServiceCollection();
    services.register(IService).to(Service);
    services.register(IService).to(Service);
    const provider = services.buildProvider();
    throws(() => provider.resolve(IService), MultipleRegistrationError);
  });

  it('Allow configuring registrations', () => {
    const services = createServiceCollection({ registrationMode: ResolveMultipleMode.LastRegistered });
    services.register(IService).to(Service);
    services.register(IService).to(OtherService);
    const provider = services.buildProvider();
    const svc = provider.resolve(IService);
    ok(svc instanceof OtherService);
  });

  it('Catch errors', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();
    try {
      provider.resolve(IService);
      fail('no error');
    } catch (err) {
      ok(err instanceof ServiceError);
    }
  });
});
