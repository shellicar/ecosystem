import { beforeEach, describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

let constructed: string[] = [];
const track = (name: string): void => {
  constructed.push(name);
};

beforeEach(() => {
  constructed = [];
});

abstract class IThing {}
class Thing implements IThing {
  constructor() {
    track('Thing');
  }
}

describe('eagerSingletons option: construct every singleton at buildProvider', () => {
  it('defaults to false: a singleton still constructs lazily, on first resolve', () => {
    const services = createServiceCollection();
    services.register(Thing).as(IThing).singleton();
    services.buildProvider();

    const actual = constructed.length;

    expect(actual).toBe(0);
  });

  it('constructs every singleton at buildProvider when true', () => {
    const services = createServiceCollection({ eagerSingletons: true });
    services.register(Thing).as(IThing).singleton();
    services.buildProvider();

    const actual = constructed.length;

    expect(actual).toBe(1);
  });

  it('leaves a non-singleton lifetime lazy even when true', () => {
    const services = createServiceCollection({ eagerSingletons: true });
    services.register(Thing).as(IThing).transient();
    services.buildProvider();

    const actual = constructed.length;

    expect(actual).toBe(0);
  });

  it('resolves the prebaked singleton without constructing again', () => {
    const services = createServiceCollection({ eagerSingletons: true });
    services.register(Thing).as(IThing).singleton();
    const provider = services.buildProvider();
    const expected = constructed.length;

    provider.resolve(IThing);

    const actual = constructed.length;
    expect(actual).toBe(expected);
  });
});
