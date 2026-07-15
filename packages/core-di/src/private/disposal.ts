import { InvalidOperationError } from '../errors';
import { syncDisposeOfAsyncOnly } from './messages';
import type { AsyncDisposable, Disposal, SyncDisposable } from './types';

const asSyncDisposable = (value: unknown): SyncDisposable | undefined => (typeof (value as Partial<SyncDisposable>)[Symbol.dispose] === 'function' ? (value as SyncDisposable) : undefined);

const asAsyncDisposable = (value: unknown): AsyncDisposable | undefined => (typeof (value as Partial<AsyncDisposable>)[Symbol.asyncDispose] === 'function' ? (value as AsyncDisposable) : undefined);

export const createDisposal = (): Disposal => {
  const lists = new Map<symbol, unknown[]>();

  return {
    announce: (instance, boundary) => {
      if (asSyncDisposable(instance) === undefined && asAsyncDisposable(instance) === undefined) {
        return;
      }
      const list = lists.get(boundary.id) ?? [];
      list.push(instance);
      lists.set(boundary.id, list);
    },
    end: (boundary) => {
      const list = lists.get(boundary.id);
      if (list === undefined) {
        return;
      }
      if (list.some((instance) => asSyncDisposable(instance) === undefined)) {
        throw new InvalidOperationError(syncDisposeOfAsyncOnly);
      }
      lists.delete(boundary.id);
      for (let i = list.length - 1; i >= 0; i--) {
        asSyncDisposable(list[i])?.[Symbol.dispose]();
      }
    },
    endAsync: async (boundary) => {
      const list = lists.get(boundary.id);
      if (list === undefined) {
        return;
      }
      lists.delete(boundary.id);
      for (let i = list.length - 1; i >= 0; i--) {
        const instance = list[i];
        const asAsync = asAsyncDisposable(instance);
        if (asAsync !== undefined) {
          await asAsync[Symbol.asyncDispose]();
          continue;
        }
        asSyncDisposable(instance)?.[Symbol.dispose]();
      }
    },
  };
};
