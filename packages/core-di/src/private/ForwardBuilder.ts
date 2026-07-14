import { InvalidOperationError, InvalidServiceIdentifierError } from '../errors';
import type { IForwardBuilder, IForwardResult } from '../interfaces';
import type { ServiceDescriptor, ServiceIdentifier, SourceType } from '../types';

type AddService = (identifier: ServiceIdentifier<SourceType>, descriptor: ServiceDescriptor<SourceType>) => void;

/**
 * The terminal returned by `.to()`. Its type ({@link IForwardResult}) exposes no
 * verb, so `forward(X).to(Y).transient()` does not typecheck. A verb forced past
 * the type (via `as any` or a plain-JS consumer) throws {@link InvalidOperationError}:
 * a forward is a pure redirect with no lifetime of its own, so setting one is
 * invalid, not a silent no-op. The runtime enforces what the type surfaces.
 */
const forwardResult = (): IForwardResult => {
  const reject = (): never => {
    throw new InvalidOperationError('A forward registration is terminal: it is a pure redirect with no lifetime of its own, so no verb can be chained after .to().');
  };
  const result: IForwardResult = {
    singleton: reject,
    scoped: reject,
    transient: reject,
    resolve: reject,
    eager: reject,
    as: reject,
    asSelf: reject,
    using: reject,
    usingAsync: reject,
  };
  return result;
};

/**
 * Builds a forward: a pure redirect from a source token to a target. `.to()`
 * records the target on a descriptor stored under the source. The descriptor's
 * instance/key/lifetime fields are inert — resolution branches on `forwardTarget`
 * and delegates to the target, so caching and lifetime stay with the target.
 */
export class ForwardBuilder<S extends SourceType> implements IForwardBuilder<S> {
  constructor(
    private readonly source: ServiceIdentifier<S>,
    private readonly addService: AddService,
  ) {}

  public to<Target extends SourceType>(target: ServiceIdentifier<Target>): IForwardResult {
    if (target == null) {
      throw new InvalidServiceIdentifierError();
    }
    // No lifetime: a forward is a pure redirect, and the engine resolves the
    // target's own registration — this descriptor's lifetime is never read.
    const descriptor: ServiceDescriptor<SourceType> = {
      implementation: this.source,
      cacheKey: Symbol(`forward:${this.source.name}`),
      createInstance: (scope) => scope.resolve(target),
      forwardTarget: target,
    };
    this.addService(this.source, descriptor);
    return forwardResult();
  }
}
