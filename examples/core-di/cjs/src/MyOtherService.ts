import { dependsOn } from '@shellicar/core-di';
import { type IMyOtherService, IMyService } from './interfaces.js';

export class MyOtherService implements IMyOtherService {
  @dependsOn(IMyService) private readonly myService!: IMyService;

  public test(): string {
    return `${this.myService.test()} world`;
  }
}
