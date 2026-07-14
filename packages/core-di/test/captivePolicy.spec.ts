import { describe, expect, it } from 'vitest';
import { CaptiveDependencyError, CaptivePolicy, createServiceCollection, dependsOn, RuntimeCaptivePolicy, ValidationProblemKind } from '../src';

abstract class IScopedDep {}
class ScopedDep implements IScopedDep {}

abstract class ITransientDep {}
class TransientDep implements ITransientDep {}

abstract class IScopedHolder {}
class ScopedHolder implements IScopedHolder {
  @dependsOn(IScopedDep) public readonly dep!: IScopedDep;
}

abstract class ITransientHolder {}
class TransientHolder implements ITransientHolder {
  @dependsOn(ITransientDep) public readonly dep!: ITransientDep;
}

describe('CaptivePolicy configuration', () => {
  it('None reports no captive problem for a singleton reaching a scoped dependency', () => {
    const services = createServiceCollection({ captivePolicy: CaptivePolicy.None });
    services.register(ScopedDep).as(IScopedDep).scoped();
    services.register(ScopedHolder).as(IScopedHolder).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([]);
  });

  it('Strict reports a captive problem for a singleton reaching a transient dependency', () => {
    const services = createServiceCollection({ captivePolicy: CaptivePolicy.Strict });
    services.register(TransientDep).as(ITransientDep).transient();
    services.register(TransientHolder).as(ITransientHolder).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });

  it('Disposal does not flag a singleton reaching a transient dependency', () => {
    const services = createServiceCollection({ captivePolicy: CaptivePolicy.Disposal });
    services.register(TransientDep).as(ITransientDep).transient();
    services.register(TransientHolder).as(ITransientHolder).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([]);
  });

  it('Disposal flags a singleton reaching a scoped dependency, driven through the option', () => {
    const services = createServiceCollection({ captivePolicy: CaptivePolicy.Disposal });
    services.register(ScopedDep).as(IScopedDep).scoped();
    services.register(ScopedHolder).as(IScopedHolder).singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });
});

// A singleton reaching a scoped instance through an opaque factory is the same
// singleton-to-scoped mismatch as the static captive, but hidden from validate()
// by the factory. It is governed by its own axis: runtimeCaptivePolicy, separate
// from the static captivePolicy: allowed under None, thrown at resolve under Throw.
describe('RuntimeCaptivePolicy governs the runtime captive (a singleton reaching scoped through an opaque factory)', () => {
  abstract class IScopedThing {}
  class ScopedThing implements IScopedThing {}
  abstract class ISingletonHolder {}
  class SingletonHolder implements ISingletonHolder {
    constructor(readonly thing: IScopedThing) {}
  }

  it('None allows a singleton to pull a scoped instance through an opaque factory at resolve', () => {
    const services = createServiceCollection({ runtimeCaptivePolicy: RuntimeCaptivePolicy.None });
    services.register(ScopedThing).as(IScopedThing).scoped();
    services
      .register(SingletonHolder)
      .using((scope) => new SingletonHolder(scope.resolve(IScopedThing)))
      .as(ISingletonHolder)
      .singleton();
    const provider = services.buildProvider();

    const actual = provider.resolve(ISingletonHolder);

    expect(actual).toBeInstanceOf(SingletonHolder);
  });

  it('Throw makes the same runtime capture an error at resolve', () => {
    const services = createServiceCollection({ runtimeCaptivePolicy: RuntimeCaptivePolicy.Throw });
    services.register(ScopedThing).as(IScopedThing).scoped();
    services
      .register(SingletonHolder)
      .using((scope) => new SingletonHolder(scope.resolve(IScopedThing)))
      .as(ISingletonHolder)
      .singleton();
    const provider = services.buildProvider();

    // The opaque factory hides the edge from validate(), so under the Throw
    // policy the capture is caught at resolve as a CaptiveDependencyError.
    const actual = () => provider.resolve(ISingletonHolder);

    expect(actual).toThrow(CaptiveDependencyError);
  });
});
