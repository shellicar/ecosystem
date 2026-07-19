import { describe, expect, it } from 'vitest';
import { createServiceCollection, type IServiceCollection, IServiceModule } from '../src';

class IAbstract {}
class Concrete extends IAbstract {}

class MyModule extends IServiceModule {
  public registerServices(services: IServiceCollection): void {
    services.register(Concrete).as(IAbstract);
  }
}

describe('Service modules', () => {
  it('registers services from a module', () => {
    const services = createServiceCollection();
    services.registerModules(MyModule);
    const provider = services.buildProvider();

    const actual = provider.resolve(IAbstract);

    expect(actual).toBeInstanceOf(Concrete);
  });
});
