import { InvalidOperationError, InvalidServiceIdentifierError } from '../errors';
import type { IForwardBuilder, IForwardResult } from '../interfaces';
import type { ServiceDescriptor, ServiceIdentifier, SourceType } from '../types';

type AddService = (identifier: ServiceIdentifier<SourceType>, descriptor: ServiceDescriptor<SourceType>) => void;

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
      createInstance: (scope) => scope.resolve(target),
      forwardTarget: target,
    };
    this.addService(this.source, descriptor);
    return forwardResult();
  }
}
