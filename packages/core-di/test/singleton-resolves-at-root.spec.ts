import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IResolutionScope } from '../src';

abstract class IDep {
  abstract readonly origin: string;
}
class RootDep implements IDep {
  public readonly origin = 'root';
}
class ScopeDep implements IDep {
  public readonly origin = 'scope';
}

abstract class IHolder {
  abstract readonly dep: IDep;
}
class Holder implements IHolder {
  @dependsOn(IDep) public readonly dep!: IDep;
}

class ScopeAware {
  @dependsOn(IResolutionScope) public readonly scope!: IResolutionScope;
}

// A singleton is one instance for the whole provider, so it belongs to the root and
// nothing a scope owns may reach it. Which boundary happens to resolve it first is an
// accident of call order, and must not decide what it holds.
describe('a singleton resolved from a scope', () => {
  it('holds the root instance of its dependency, not the resolving scope\u2019s', () => {
    const services = createServiceCollection();
    services.register(RootDep).as(IDep).scoped();
    services.register(Holder).as(IHolder).singleton();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const expected = provider.resolve(IDep);
    const actual = scope.resolve(IHolder).dep;

    expect(actual).toBe(expected);
  });

  it('holds the root provider for IResolutionScope, not the resolving scope', () => {
    const services = createServiceCollection();
    services.register(ScopeAware).asSelf().singleton();
    const provider = services.buildProvider();
    const scope = provider.createScope();

    const expected = provider;
    const actual = scope.resolve(ScopeAware).scope;

    expect(actual).toBe(expected);
  });

  it("resolves its dependency from the root's registrations, not a shadow the resolving scope declared", () => {
    const services = createServiceCollection();
    services.register(RootDep).as(IDep).scoped();
    services.register(Holder).as(IHolder).singleton();
    const provider = services.buildProvider();
    const scope = provider.createScope();
    scope.Services.register(ScopeDep).as(IDep).shadow().scoped();

    const expected = 'root';
    const actual = scope.resolve(IHolder).dep.origin;

    expect(actual).toBe(expected);
  });
});
