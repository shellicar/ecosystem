import { describe, expect, it } from 'vitest';
import { createServiceCollection, ResolveMultipleMode } from '../src';
import { MultipleRegistrationError, ServiceError, UnregisteredServiceError } from '@shellicar/core-di-engine';

abstract class IService {}
class Service implements IService {}
class OtherService implements IService {}

describe('errors', () => {
  it('throws UnregisteredServiceError for an unregistered face', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();

    const actual = () => provider.resolve(IService);

    expect(actual).toThrow(UnregisteredServiceError);
  });

  it('throws MultipleRegistrationError when a face has several registrations', () => {
    const services = createServiceCollection();
    services.register(Service).as(IService);
    services.register(Service).as(IService);
    const provider = services.buildProvider();

    const actual = () => provider.resolve(IService);

    expect(actual).toThrow(MultipleRegistrationError);
  });

  it('resolves the last registration under LastRegistered mode', () => {
    const services = createServiceCollection({ registrationMode: ResolveMultipleMode.LastRegistered });
    services.register(Service).as(IService);
    services.register(OtherService).as(IService);
    const provider = services.buildProvider();

    const actual = provider.resolve(IService);

    expect(actual).toBeInstanceOf(OtherService);
  });

  it('errors are a ServiceError', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();

    const actual = () => provider.resolve(IService);

    expect(actual).toThrow(ServiceError);
  });
});
