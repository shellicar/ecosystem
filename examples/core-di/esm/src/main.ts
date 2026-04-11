import { createServiceCollection } from '@shellicar/core-di';
import { IMyOtherService } from './interfaces.js';
import { MyModule } from './MyModule.js';

const services = createServiceCollection();
services.registerModules(MyModule);
const provider = services.buildProvider();

using scope = provider.createScope();

const svc = scope.resolve(IMyOtherService);
console.log(svc.test());
