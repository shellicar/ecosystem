import type { ClassMetadata } from '@shellicar/core-di-engine';
import { DesignDependenciesKey, dependsOn, getMetadata, tagFieldMetadata } from '@shellicar/core-di-engine';
import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

// A decorated field named __proto__. Absurd in real code, but the failure mode
// was silent: on a plain record, record['__proto__'] = identifier hits the
// inherited accessor and reassigns the record's prototype instead of storing an
// entry, so the dependency edge vanished with no error. These tests pin the
// null-prototype fix.

abstract class IDep {}
class Dep implements IDep {}

describe('a dependency recorded under the name __proto__', () => {
  it('lands as an own property of the metadata record, not as its prototype', () => {
    const meta: ClassMetadata = {};

    tagFieldMetadata(DesignDependenciesKey, meta, '__proto__', IDep);
    const record = meta[DesignDependenciesKey] as object;

    expect(Object.hasOwn(record, '__proto__')).toBe(true);
  });

  it('does not reassign the record prototype to the identifier', () => {
    const meta: ClassMetadata = {};

    tagFieldMetadata(DesignDependenciesKey, meta, '__proto__', IDep);
    const record = meta[DesignDependenciesKey] as object;

    expect(Object.getPrototypeOf(record)).not.toBe(IDep);
  });

  it('keeps the edge visible to getMetadata alongside ordinary names', () => {
    abstract class IOther {}
    const meta: ClassMetadata = {};

    tagFieldMetadata(DesignDependenciesKey, meta, 'ordinary', IOther);
    tagFieldMetadata(DesignDependenciesKey, meta, '__proto__', IDep);
    const record = meta[DesignDependenciesKey] as Record<string, unknown>;

    expect(Object.hasOwn(record, 'ordinary')).toBe(true);
    expect(Object.hasOwn(record, '__proto__')).toBe(true);
  });

  it('wires the field end to end through the container', () => {
    abstract class IHolder {}
    class Holder implements IHolder {
      @dependsOn(IDep) public readonly ['__proto__']!: IDep;
    }
    const services = createServiceCollection();
    services.register(Dep).as(IDep).singleton();
    services.register(Holder).as(IHolder).singleton();
    const provider = services.buildProvider();
    const expected = provider.resolve(IDep);

    const holder = provider.resolve(IHolder) as Holder;

    // The class field exists as an own data property before wiring assigns,
    // so the instance write is shadowed and safe.
    expect(Object.hasOwn(Holder.prototype.constructor.prototype, '__proto__') || Object.hasOwn(holder, '__proto__')).toBe(true);
    expect(holder['__proto__']).toBe(expected);
    expect(getMetadata(DesignDependenciesKey, Holder)).toBeDefined();
  });
});
