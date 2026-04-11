import type { IMyService } from './interfaces.js';

export class MyService implements IMyService {
  public test(): string {
    return 'hello';
  }
}
