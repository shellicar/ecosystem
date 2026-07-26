import { InvalidOperationError, InvalidServiceIdentifierError } from '../errors';
import type { IForwardBuilder, IScopedForwardBuilder, IScopedForwardResult } from '../interfaces';
import type { ServiceDescriptor, ServiceIdentifier, SourceType } from '../types';
import { forwardIsTerminal, shadowAlreadySet } from './messages';
import type { AddService } from './types';

const forwardResult = (descriptor: ServiceDescriptor<SourceType>, scoped: boolean): IScopedForwardResult => {
  const reject = (): never => {
    throw new InvalidOperationError(forwardIsTerminal);
  };
  const result: Record<string, unknown> = {
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
  // Symmetry with the newable/abstract builders: a capability the collection lacks
  // (root, not scoped) is absent from the runtime object, not present-and-throwing.
  if (scoped) {
    result.shadow = () => {
      if (descriptor.shadow === true) {
        throw new InvalidOperationError(shadowAlreadySet);
      }
      descriptor.shadow = true;
    };
  }
  return result as IScopedForwardResult;
};

export class ForwardBuilder<S extends SourceType> implements IForwardBuilder<S>, IScopedForwardBuilder<S> {
  constructor(
    private readonly source: ServiceIdentifier<S>,
    private readonly addService: AddService,
    private readonly scoped: boolean = false,
  ) {}

  public to<Target extends SourceType>(target: ServiceIdentifier<Target>): IScopedForwardResult {
    if (target == null) {
      throw new InvalidServiceIdentifierError();
    }
    const descriptor: ServiceDescriptor<SourceType> = {
      implementation: this.source,
      cacheKey: Symbol(`forward:${this.source.name}`),
      createInstance: (scope) => scope.resolve(target),
      forwardTarget: target,
    };
    this.addService(this.source, descriptor);
    return forwardResult(descriptor, this.scoped);
  }
}
