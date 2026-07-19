import { ok } from 'node:assert/strict';
import { createServiceCollection, type IServiceCollection, ResolveMultipleMode } from '@shellicar/core-di';

abstract class IOptions {
  abstract connectionString(): string;
}
class Options implements IOptions {
  connectionString(): string {
    return process.env.MY_CONNECTION_STRING ?? '';
  }
}
class MockOptions implements IOptions {
  connectionString(): string {
    return ':memory:';
  }
}

const registerDependencies = (svc: IServiceCollection) => {
  svc.register(Options).as(IOptions);
};

const services = createServiceCollection({ registrationMode: ResolveMultipleMode.LastRegistered });
registerDependencies(services);

// Later
const registerMockDependencies = (svc: IServiceCollection) => {
  svc.register(MockOptions).as(IOptions);
};

registerMockDependencies(services);

const provider = services.buildProvider();
const options = provider.resolve(IOptions);
ok(options instanceof MockOptions);
