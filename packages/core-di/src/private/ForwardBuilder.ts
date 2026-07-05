import { Lifetime } from '../enums';
import { InvalidServiceIdentifierError } from '../errors';
import type { IForwardBuilder, IForwardResult } from '../interfaces';
import type { ServiceDescriptor, ServiceIdentifier, SourceType } from '../types';

type AddService = (identifier: ServiceIdentifier<SourceType>, descriptor: ServiceDescriptor<SourceType>) => void;

/**
 * The terminal returned by `.to()`. Its type ({@link IForwardResult}) exposes no
 * lifetime verb, so `forward(X).to(Y).transient()` does not typecheck. The no-op
 * verbs exist only so a call forced past the type system (via `@ts-expect-error`
 * or plain JS) is harmless rather than a runtime crash — a forward has no lifetime
 * to set.
 */
const forwardResult = (): IForwardResult => {
  const result = {
    singleton: () => result,
    scoped: () => result,
    transient: () => result,
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
    const descriptor: ServiceDescriptor<SourceType> = {
      implementation: this.source,
      cacheKey: Symbol(`forward:${this.source.name}`),
      lifetime: Lifetime.Resolve,
      createInstance: (scope) => scope.resolve(target),
      forwardTarget: target,
    };
    this.addService(this.source, descriptor);
    return forwardResult();
  }
}
