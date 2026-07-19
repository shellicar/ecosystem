import type { IServiceCollection, IServiceModule } from '@shellicar/core-di';
import { IMyOtherService, IMyService } from './interfaces.js';
import { MyOtherService } from './MyOtherService.js';
import { MyService } from './MyService.js';

export class MyModule implements IServiceModule {
  registerServices(services: IServiceCollection): void {
    services.register(MyService).as(IMyService);
    services.register(MyOtherService).as(IMyOtherService);
  }
}
