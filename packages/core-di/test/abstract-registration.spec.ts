import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

abstract class IThing {
  abstract name(): string;
}

// An abstract class is a legitimate registration: it is the type contract, not
// something to construct. It cannot be built by zero-arg `new`, so `using()`
// supplies the instance.
abstract class ThingBase implements IThing {
  abstract name(): string;
}

class RealThing extends ThingBase {
  name(): string {
    return 'real';
  }
}

describe('Registering an abstract class', () => {
  it('builds via the factory and resolves under a face', () => {
    const services = createServiceCollection();
    services
      .register(ThingBase)
      .using(() => new RealThing())
      .as(IThing);
    const provider = services.buildProvider();

    const expected = 'real';
    const actual = provider.resolve(IThing).name();

    expect(actual).toBe(expected);
  });

  it('does not offer asSelf on a bare abstract registration', () => {
    const services = createServiceCollection();

    services
      .register(ThingBase)
      // @ts-expect-error - a bare abstract class cannot be built as itself; supply .using() first
      .asSelf();
  });
});
