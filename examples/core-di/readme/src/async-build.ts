import { equal } from 'node:assert/strict';
import { createServiceCollection } from '@shellicar/core-di';

abstract class IConnection {
  abstract query(): string;
}
class Connection implements IConnection {
  constructor(private readonly dsn: string) {}
  public query(): string {
    return `querying ${this.dsn}`;
  }
}

// `async: true` is declared at collection creation. Only then do the builders
// carry `usingAsync`, and only then does `buildProviderAsync` exist; a
// synchronous build could not await the factory.
const services = createServiceCollection({ async: true });
services
  .register(Connection)
  .usingAsync(async () => new Connection('postgres://localhost'))
  .as(IConnection)
  .singleton();

// Async singleton factories are awaited at the build boundary, in dependency
// order, so every later resolve() is synchronous.
const provider = await services.buildProviderAsync();
const svc = provider.resolve(IConnection);
equal(svc.query(), 'querying postgres://localhost');
