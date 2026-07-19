import { equal } from 'node:assert/strict';
import { createServiceCollection, type IAsyncDisposable, type IDisposable } from '@shellicar/core-di';

class Connection implements IDisposable {
  public closed = false;
  public [Symbol.dispose](): void {
    this.closed = true;
  }
}

// A disposable is tracked against the boundary that resolved it and disposed at
// that owner's end: a scoped instance at scope dispose, a singleton at provider
// dispose, a transient or resolve instance at the boundary that resolved it.
const services = createServiceCollection();
services.register(Connection).asSelf().scoped();
const provider = services.buildProvider();

let connection: Connection;
{
  using scope = provider.createScope();
  connection = scope.resolve(Connection);
}
// The scope was disposed at the block's end (`using`), so its scoped instance
// was disposed with it.
equal(connection.closed, true);

class AsyncConnection implements IAsyncDisposable {
  public closed = false;
  public async [Symbol.asyncDispose](): Promise<void> {
    this.closed = true;
  }
}

// An async-only disposable must be torn down through Symbol.asyncDispose
// (`await using`); a synchronous dispose of a boundary holding one throws.
const asyncServices = createServiceCollection();
asyncServices.register(AsyncConnection).asSelf().singleton();
const asyncProvider = asyncServices.buildProvider();
const asyncConnection = asyncProvider.resolve(AsyncConnection);
await asyncProvider[Symbol.asyncDispose]();
equal(asyncConnection.closed, true);
