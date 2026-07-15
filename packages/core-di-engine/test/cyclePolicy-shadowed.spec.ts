import { describe, expect, it } from 'vitest';
import { createDescriptorMap, cyclePolicy, deriveFacts, type DescriptorMap, runGraphPolicies, type ServiceDescriptor, type ServiceIdentifier, type ServiceImplementation, type SourceType, ValidationProblemKind } from '../src';

// A cycle through a registration that a later registration shadows for
// resolve(). Whether this is an error depends on which door the app uses:
// resolve() never walks the shadowed node (under Error mode it throws for the
// multi-registered token; under LastRegistered it takes the last), but
// resolveAll() walks EVERY registration in both modes, so the cycle is always
// potentially reachable and never certainly reached — and validate() cannot
// know which doors the app calls. The ruling: validate stays conservative and
// reports the cycle, and the message says which door it bites through, so a
// deliberate last-wins override can be recognised for what it is instead of
// eroding trust in the report.

const descriptor = <T extends SourceType>(implementation: ServiceImplementation<T>, declaredDeps?: readonly ServiceIdentifier<SourceType>[]): ServiceDescriptor<T> => ({
  implementation,
  cacheKey: Symbol(implementation.name),
  createInstance: () => new implementation(),
  usesFactory: declaredDeps != null,
  declaredDeps,
});

const mapOf = (...entries: readonly [ServiceIdentifier<SourceType>, ServiceDescriptor<SourceType>][]): DescriptorMap => {
  const map = createDescriptorMap();
  for (const [identifier, desc] of entries) {
    const bucket = map.get(identifier) ?? [];
    bucket.push(desc);
    map.set(identifier, bucket);
  }
  return map;
};

abstract class IA {}
abstract class IB {}
class OldA implements IA {}
class NewA implements IA {}
class B implements IB {}

// OldA <-> B is a cycle; NewA shadows OldA for resolve(IA).
const shadowedCycleMap = (): DescriptorMap => mapOf([IA, descriptor(OldA, [IB])], [IB, descriptor(B, [IA])], [IA, descriptor(NewA)]);

describe('cyclePolicy and shadowed registrations', () => {
  it('reports a cycle reachable only through a shadowed registration: resolveAll walks every registration in both modes', () => {
    const problems = runGraphPolicies(deriveFacts(shadowedCycleMap()), [cyclePolicy]);

    const actual = problems.map((p) => p.kind);

    expect(actual).toEqual([ValidationProblemKind.Cycle]);
  });

  it('says which door the cycle bites through: shadowed for resolve(), reachable via resolveAll()', () => {
    const problems = runGraphPolicies(deriveFacts(shadowedCycleMap()), [cyclePolicy]);

    const actual = problems[0]?.message;

    expect(actual).toMatch(/shadowed for resolve\(\)/);
    expect(actual).toMatch(/resolveAll\(\)/);
  });

  it('does not qualify a cycle whose registrations are all live for resolve()', () => {
    const plainCycleMap = mapOf([IA, descriptor(OldA, [IB])], [IB, descriptor(B, [IA])]);
    const problems = runGraphPolicies(deriveFacts(plainCycleMap), [cyclePolicy]);

    const actual = problems[0]?.message;

    expect(actual).not.toMatch(/shadowed/);
  });
});
