import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, Lifetime, ValidationProblemKind } from '../src';

abstract class IThing {}
class Thing implements IThing {}

abstract class ITwoFields {
  abstract readonly a: IThing;
  abstract readonly b: IThing;
}
class TwoFields implements ITwoFields {
  @dependsOn(IThing) public readonly a!: IThing;
  @dependsOn(IThing) public readonly b!: IThing;
}

describe('defaultLifetime option: the lifetime an un-verbed registration gets', () => {
  it('defaults to Resolve when omitted: an un-verbed registration is shared within a pass', () => {
    const services = createServiceCollection();
    services.register(Thing).as(IThing);
    services.register(TwoFields).as(ITwoFields);
    const provider = services.buildProvider();
    const parent = provider.resolve(ITwoFields);
    const expected = parent.a;

    const actual = parent.b;

    expect(actual).toBe(expected);
  });

  it('defaults to Resolve when omitted: an un-verbed registration is distinct across passes', () => {
    const services = createServiceCollection();
    services.register(Thing).as(IThing);
    const provider = services.buildProvider();
    const first = provider.resolve(IThing);

    const actual = provider.resolve(IThing);

    expect(actual).not.toBe(first);
  });

  it('makes an un-verbed registration a singleton under defaultLifetime: Singleton', () => {
    const services = createServiceCollection({ defaultLifetime: Lifetime.Singleton });
    services.register(Thing).as(IThing);
    const provider = services.buildProvider();
    const expected = provider.resolve(IThing);

    const actual = provider.resolve(IThing);

    expect(actual).toBe(expected);
  });

  it('is overridden by an explicit lifetime verb', () => {
    const services = createServiceCollection({ defaultLifetime: Lifetime.Singleton });
    services.register(Thing).as(IThing).transient();
    const provider = services.buildProvider();
    const first = provider.resolve(IThing);

    const actual = provider.resolve(IThing);

    expect(actual).not.toBe(first);
  });

  // The bug this pins against: an un-verbed root used to carry no lifetime into
  // the captive walk, so under a singleton default it silently escaped detection.
  it('validate() flags an un-verbed root holding a scoped dependency under defaultLifetime: Singleton', () => {
    abstract class IScopedDep {}
    class ScopedDep implements IScopedDep {}
    abstract class IHolder {}
    class Holder implements IHolder {
      @dependsOn(IScopedDep) public readonly dep!: IScopedDep;
    }
    const services = createServiceCollection({ defaultLifetime: Lifetime.Singleton });
    services.register(ScopedDep).as(IScopedDep).scoped();
    services.register(Holder).as(IHolder);

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.CaptiveDependency]);
  });

  // Resolving commits the collection: the default lifetime is stamped onto every
  // un-verbed registration at that point, so a verb arriving afterwards would be
  // re-deciding a lifetime an instance may already have been served under. The
  // refusal is deliberate, and the message names the commit, not a phantom verb.
  it('refuses a lifetime verb on a scope registration that was already resolved, naming the commit', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();
    const scope = provider.createScope();
    const builder = scope.Services.register(Thing).as(IThing);
    scope.resolve(IThing);

    const actual = () => builder.scoped();

    expect(actual).toThrow('already committed with the default lifetime');
  });
});
