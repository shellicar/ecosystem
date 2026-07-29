import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, type IServiceCollection, ValidationProblemKind } from '../src';

abstract class IDep {}
class Dep implements IDep {}

abstract class IHolder {}
class Holder implements IHolder {
  @dependsOn(IDep) public readonly dep!: IDep;
}

const singletonHolding = (register: (services: IServiceCollection) => void) => {
  const services = createServiceCollection();
  register(services);
  services.register(Holder).as(IHolder).singleton();
  return services;
};

// A singleton may hold what is shared at least as widely as itself, or what is not
// shared at all. Anything shared more narrowly gets a private instance wearing a
// shared contract, and which instance depends on how the singleton came to be built.
describe('validate() on what a singleton holds', () => {
  it('reports a resolve-lifetime dependency, which is shared per resolve', () => {
    const services = singletonHolding((s) => s.register(Dep).as(IDep).resolve());

    const expected = [ValidationProblemKind.SharingMismatch];
    const actual = services.validate().warnings.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });

  it('stays valid: every singleton resolves in its own pass, so nothing misbehaves', () => {
    const services = singletonHolding((s) => s.register(Dep).as(IDep).resolve());

    const actual = services.validate().valid;

    expect(actual).toBe(true);
  });

  it('reports a scoped dependency as both a sharing mismatch and the separate disposal hazard', () => {
    const services = singletonHolding((s) => s.register(Dep).as(IDep).scoped());

    const expected = [ValidationProblemKind.SharingMismatch, ValidationProblemKind.CaptiveDependency];
    const actual = services.validate().warnings.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });

  it('says nothing about a transient dependency, which is shared with nobody', () => {
    const services = singletonHolding((s) => s.register(Dep).as(IDep).transient());

    const expected = { valid: true, errors: [], warnings: [] };
    const actual = services.validate();

    expect(actual).toEqual(expected);
  });

  it('says nothing about another singleton, shared as widely as itself', () => {
    const services = singletonHolding((s) => s.register(Dep).as(IDep).singleton());

    const expected = { valid: true, errors: [], warnings: [] };
    const actual = services.validate();

    expect(actual).toEqual(expected);
  });

  it('reports a dependency reached through an intermediate, not only a direct one', () => {
    abstract class IMiddle {}
    class Middle implements IMiddle {
      @dependsOn(IDep) public readonly dep!: IDep;
    }
    const services = createServiceCollection();
    services.register(Dep).as(IDep).resolve();
    services.register(Middle).as(IMiddle).transient();
    const holder = class Outer {
      @dependsOn(IMiddle) public readonly middle!: IMiddle;
    };
    services.register(holder).asSelf().singleton();

    const expected = [ValidationProblemKind.SharingMismatch];
    const actual = services.validate().warnings.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });
});
