import { provider } from './helpers/provider.js';

abstract class IContext {
  abstract userId(): string;
}
class Context implements IContext {
  userId(): string {
    return '';
  }
}

using scope = provider.createScope();
scope.Services.register(Context).as(IContext);
const ctx = scope.resolve(IContext);
