import { equal } from 'node:assert/strict';
import { createServiceCollection, dependsOn } from '@shellicar/core-di';
import { Dependency, IDependency } from './helpers/examples';

const services = createServiceCollection();

class Service {
  @dependsOn(IDependency) private readonly dependency!: IDependency;

  public test() {
    return this.dependency.test();
  }
}

services.register(IDependency).to(Dependency);
services.register(Service).to(Service);
const provider = services.buildProvider();
const svc = provider.resolve(Service);
equal(svc.test(), 'hello');
