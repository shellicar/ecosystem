import { equal } from 'node:assert/strict';
import { createServiceCollection, dependsOn } from '@shellicar/core-di';
import { Dependency, IDependency } from './helpers/examples.js';

const services = createServiceCollection();

class Service {
  @dependsOn(IDependency) private readonly dependency!: IDependency;

  public test() {
    return this.dependency.test();
  }
}

services.register(Dependency).as(IDependency);
services.register(Service).asSelf();
const provider = services.buildProvider();
const svc = provider.resolve(Service);
equal(svc.test(), 'hello');
