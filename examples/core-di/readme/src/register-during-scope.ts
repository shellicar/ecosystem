import { provider } from './helpers/provider';

abstract class IContext {
  abstract userId(): string;
}
class Context implements IContext {
  userId(): string {
    return '';
  }
}

using scope = provider.createScope();
scope.Services.register(IContext).to(Context);
const ctx = scope.resolve(IContext);
