import type { Boundary, DisposalSink } from './boundaryEngine';

/**
 * The disposal feature (decisions.md §8) — a composed tracker over the engine's
 * disposal seam. It holds one list of disposables per boundary: every announced
 * construction is filed under the boundary that resolved it, and a boundary's
 * end disposes exactly its own list. That single choice of key *is* the
 * nearest-boundary rule — a scope-resolved transient is announced against the
 * scope and files under it, a root-resolved one files under the root, and a
 * singleton (pre-baked at the root) files under the root however it is later
 * reached. "The pass never disposes" means only that pass exit is not a disposal
 * event (the caller holds the result), not that a resolve-lifetime instance goes
 * untracked: every constructed disposable is announced to its resolving boundary,
 * no lifetime exempt, and dies at that boundary's end (scope-resolved at scope
 * dispose, root-resolved at provider dispose).
 *
 * Sync and async disposables share the one list; only the end differs. `end`
 * (sync, `Symbol.dispose`) refuses a boundary that holds an async-only
 * disposable — one that can only be torn down asynchronously — throwing rather
 * than dropping the teardown on the floor; `endAsync` awaits each in turn,
 * preferring `Symbol.asyncDispose`.
 */

type SyncDisposable = { [Symbol.dispose](): void };
type AsyncDisposable = { [Symbol.asyncDispose](): PromiseLike<void> };

const asSyncDisposable = (value: unknown): SyncDisposable | undefined => (typeof (value as Partial<SyncDisposable>)[Symbol.dispose] === 'function' ? (value as SyncDisposable) : undefined);

const asAsyncDisposable = (value: unknown): AsyncDisposable | undefined => (typeof (value as Partial<AsyncDisposable>)[Symbol.asyncDispose] === 'function' ? (value as AsyncDisposable) : undefined);

/** The disposal feature: a {@link DisposalSink} that also ends a boundary asynchronously. */
export type Disposal = DisposalSink & {
  endAsync(boundary: Boundary): Promise<void>;
};

export const createDisposal = (): Disposal => {
  // Keyed on the boundary's id (a symbol): a boundary's end drops its whole list
  // by deleting one key. The nearest-boundary rule is only ever this key choice.
  const lists = new Map<symbol, unknown[]>();

  return {
    announce: (instance, boundary) => {
      // File only what carries teardown; a plain instance owns none.
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
      // An async-only disposable cannot be awaited on a sync end. Refuse before
      // touching anything, leaving the list intact so the caller can end the
      // boundary asynchronously instead of losing half its teardown.
      if (list.some((instance) => asSyncDisposable(instance) === undefined)) {
        throw new Error('Cannot synchronously dispose a boundary holding an async-only disposable; dispose it asynchronously.');
      }
      lists.delete(boundary.id);
      // Reverse (LIFO): a dependant is torn down before what it depended on.
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
