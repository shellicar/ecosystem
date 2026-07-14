import { createServiceCollection, type IServiceCollection, type IServiceModule } from '@shellicar/core-di';
import { Concrete, IAbstract } from './helpers/examples.js';

const services = createServiceCollection();

class MyModule implements IServiceModule {
  public registerServices(services: IServiceCollection): void {
    services.register(Concrete).as(IAbstract);
  }
}

services.registerModules(MyModule);
const provider = services.buildProvider();
const svc = provider.resolve(IAbstract);
