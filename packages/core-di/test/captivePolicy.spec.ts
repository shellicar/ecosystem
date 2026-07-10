import { describe, expect, it } from 'vitest';
import { CaptivePolicy, createServiceCollection, dependsOn, ValidationProblemKind } from '../src';

abstract class IScopedDep {}
class ScopedDep implements IScopedDep {}

abstract class ITransientDep {}
class TransientDep implements ITransientDep {}

abstract class IScopedHolder {}
class ScopedHolder implements IScopedHolder {
  @dependsOn(IScopedDep) private readonly dep!: IScopedDep;
}

abstract class ITransientHolder {}
class TransientHolder implements ITransientHolder {
  @dependsOn(ITransientDep) private readonly dep!: ITransientDep;
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
