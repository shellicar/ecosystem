import { InvalidOperationError, InvalidServiceIdentifierError } from '../errors';
import type { IForwardBuilder, IForwardResult, IScopedForwardBuilder } from '../interfaces';
import type { ServiceDescriptor, ServiceIdentifier, SourceType } from '../types';
import { forwardIsTerminal, shadowAlreadySet } from './messages';
import type { AddService } from './types';

const forwardResult = (): IForwardResult => {
  const reject = (): never => {
    throw new InvalidOperationError(forwardIsTerminal);
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
    protected readonly source: ServiceIdentifier<S>,
    protected readonly addService: AddService,
    protected readonly shadowDepth: number = 0,
  ) {}

  protected shadowFlag(): boolean {
    return false;
  }

  public to<Target extends SourceType>(target: ServiceIdentifier<Target>): IForwardResult {
    if (target == null) {
      throw new InvalidServiceIdentifierError();
    }
    const descriptor: ServiceDescriptor<SourceType> = {
      implementation: this.source,
      cacheKey: Symbol(`forward:${this.source.name}`),
      createInstance: (scope) => scope.resolve(target),
      forwardTarget: target,
      shadow: this.shadowFlag(),
      shadowDepth: this.shadowDepth,
    };
    this.addService(this.source, descriptor);
    return forwardResult();
  }
}

/**
 * The scoped flavour: `.shadow()` sets a pending flag on the builder itself, read
 * only once, when `.to()` creates the descriptor. The flag is fixed at that moment,
 * never mutated on the descriptor afterward — a scope cloned in between `.to()` and
 * a later `.shadow()` call would otherwise see the flag appear retroactively, since
 * a clone shares the descriptor object by reference.
 */
export class ScopedForwardBuilder<S extends SourceType> extends ForwardBuilder<S> implements IScopedForwardBuilder<S> {
  private pendingShadow = false;

  public shadow(): this {
    if (this.pendingShadow) {
      throw new InvalidOperationError(shadowAlreadySet);
    }
    this.pendingShadow = true;
    return this;
  }

  protected override shadowFlag(): boolean {
    return this.pendingShadow;
  }
}
