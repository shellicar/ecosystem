import { describe, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IFirst {
  abstract first(): number;
}
class First implements IFirst {
  first(): number {
    return 1;
  }
}

abstract class ISecond {
  abstract second(): string;
}
class Second implements ISecond {
  second(): string {
    return 'two';
  }
}

class Target {
  constructor(
    readonly one: IFirst,
    readonly two: ISecond,
  ) {}
}

// Type-level pins: the declared deps' resolved types line up with the factory's
// parameters, positionally. These are compile-time checks — the @ts-expect-error
// cases are the design's guarantee that a mismatched factory is rejected.
describe('using([deps], factory) — type checking', () => {
  it('lines the resolved dep types up with the factory parameters', () => {
    const services = createServiceCollection();

    services
      .register(Target)
      .using([IFirst, ISecond], (one: IFirst, two: ISecond) => new Target(one, two))
      .asSelf();
  });

  it('infers the factory parameter types from the declared deps', () => {
    const services = createServiceCollection();

    // Unannotated parameters are contextually typed to [IFirst, ISecond].
    services
      .register(Target)
      .using([First, Second], (one, two) => new Target(one, two))
      .asSelf();
  });

  it('rejects a factory whose parameter types do not match the declared deps', () => {
    const services = createServiceCollection();

    services
      .register(Target)
      // @ts-expect-error - the deps resolve to [IFirst, ISecond], not [ISecond, IFirst]
      .using([IFirst, ISecond], (one: ISecond, two: IFirst) => new Target(two, one))
      .asSelf();
  });

  it('rejects a factory that declares more parameters than there are deps', () => {
    const services = createServiceCollection();

    services
      .register(Target)
      // @ts-expect-error - one dep is declared, but the factory expects two
      .using([IFirst], (one: IFirst, two: ISecond) => new Target(one, two))
      .asSelf();
  });
});
