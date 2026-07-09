/**
 * Nearest-boundary disposal — EXPERIMENT (evidence, not production code). MINIMAL.
 *
 * The decision this pins: a disposable transient dies with the boundary that
 * RESOLVED it — scope-resolved dies at scope dispose, root-resolved at
 * provider dispose. And the SC's observation, shown in code: the whole rule is
 * just WHERE THE LIST SITS. The disposal feature is a Map<boundary, list>;
 * "nearest boundary" only names which key an instance is tracked under — the
 * boundary the resolve call came through. No other machinery exists.
 *
 * Disposal is itself a composable feature: the engine only announces
 * constructions with the current boundary; compose the tracker out and
 * nothing tracks anything.
 */
import { describe, expect, it } from 'vitest';

type Token = abstract new (...args: any[]) => any;
type Impl = new () => any;
type Node = { readonly impl: Impl; readonly singleton?: boolean };

const isDisposable = (x: unknown): x is { [Symbol.dispose](): void } => {
  return typeof (x as { [Symbol.dispose]?: unknown })[Symbol.dispose] === 'function';
};

// The entire disposal feature. Note what "nearest boundary" costs: nothing —
// it is only the choice of key at the track() call site.
class DisposalFeature {
  private readonly lists = new Map<object, unknown[]>();

  track(boundary: object, instance: unknown): void {
    if (!isDisposable(instance)) return;
    const list = this.lists.get(boundary) ?? [];
    list.push(instance);
    this.lists.set(boundary, list);
  }

  end(boundary: object): void {
    for (const instance of this.lists.get(boundary) ?? []) {
      (instance as { [Symbol.dispose](): void })[Symbol.dispose]();
    }
    this.lists.delete(boundary);
  }
}

// A deliberately tiny provider: singleton table + transient floor only.
class TinyProvider {
  private readonly singletons = new Map<Token, unknown>();
  private readonly rootBoundary = {};

  constructor(
    private readonly regs: Map<Token, Node>,
    private readonly disposal: DisposalFeature,
  ) {}

  resolve<T>(token: Token, boundary: object = this.rootBoundary): T {
    const node = this.regs.get(token);
    if (node === undefined) {
      throw new Error(`unregistered ${token.name}`);
    }
    if (node.singleton) {
      if (!this.singletons.has(token)) {
        // A singleton's owner is the provider — tracked to the root boundary
        // no matter which boundary's resolve constructed it.
        this.singletons.set(token, this.make(node.impl, this.rootBoundary));
      }
      return this.singletons.get(token) as T;
    }
    // The transient floor: tracked to the NEAREST boundary — the caller's.
    return this.make(node.impl, boundary) as T;
  }

  createScope() {
    const boundary = {};
    return {
      resolve: <T>(token: Token): T => this.resolve<T>(token, boundary),
      [Symbol.dispose]: () => this.disposal.end(boundary),
    };
  }

  [Symbol.dispose](): void {
    this.disposal.end(this.rootBoundary);
  }

  private make(impl: Impl, boundary: object): unknown {
    const instance = new impl();
    this.disposal.track(boundary, instance);
    return instance;
  }
}

abstract class IThing {
  abstract readonly disposed: boolean;
}
class Thing implements IThing {
  #disposed = false;
  get disposed() {
    return this.#disposed;
  }
  [Symbol.dispose]() {
    this.#disposed = true;
  }
}

const makeProvider = (singleton = false) => {
  const regs = new Map<Token, Node>([[IThing, { impl: Thing, singleton }]]);
  return new TinyProvider(regs, new DisposalFeature());
};

describe('nearest-boundary disposal', () => {
  it('a scope-resolved transient dies at scope dispose, not provider dispose', () => {
    const provider = makeProvider();
    const scope = provider.createScope();

    const instance = scope.resolve<IThing>(IThing);
    scope[Symbol.dispose]();

    expect(instance.disposed).toBe(true);
  });

  it('a scope-resolved transient does not wait for the provider', () => {
    const provider = makeProvider();
    const scope = provider.createScope();
    const instance = scope.resolve<IThing>(IThing);

    provider[Symbol.dispose](); // provider ends first — the scope still owns it

    expect(instance.disposed).toBe(false);
  });

  it('a root-resolved transient survives scope ends and dies at provider dispose', () => {
    const provider = makeProvider();
    const scope = provider.createScope();

    const instance = provider.resolve<IThing>(IThing);
    scope[Symbol.dispose]();
    expect(instance.disposed).toBe(false);

    provider[Symbol.dispose]();
    expect(instance.disposed).toBe(true);
  });

  it('a singleton constructed via a scope is still owned by the provider', () => {
    const provider = makeProvider(true);
    const scope = provider.createScope();

    const instance = scope.resolve<IThing>(IThing); // constructed through the scope
    scope[Symbol.dispose]();
    expect(instance.disposed).toBe(false); // scope end does not touch it

    provider[Symbol.dispose]();
    expect(instance.disposed).toBe(true);
  });
});
