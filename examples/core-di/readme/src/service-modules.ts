import { createServiceCollection, type IServiceCollection, type IServiceModule } from '@shellicar/core-di';
import { Concrete, IAbstract } from './helpers/examples';

const services = createServiceCollection();

class MyModule implements IServiceModule {
  public registerServices(services: IServiceCollection): void {
    services.register(IAbstract).to(Concrete);
  }
}

services.registerModules(MyModule);
const provider = services.buildProvider();
const svc = provider.resolve(IAbstract);
