import { describe, expect, it } from 'vitest';
import { Lifetime, ValidationProblemKind } from '../src/enums';
import { deriveFacts } from '../src/private/graph';
import { asyncThroughSyncPathPolicy } from '../src/private/policies';
import { createDescriptorMap, type DescriptorMap, type ServiceDescriptor, type ServiceIdentifier, type ServiceImplementation, type SourceType } from '../src/types';

// The async-through-sync-path policy is proven standalone against a hand-built
// graph — the same off-container discipline as the other graph policies. Wiring
// it into the composed validate() set is Phase 17.

// The policy is purely static: it reads only facts.isAsync and facts.lifetime,
// never the factory body — so a plain sync createInstance with isAsync flagged
// models an async registration faithfully for this test.
const asyncDescriptor = <T extends SourceType>(implementation: ServiceImplementation<T>, lifetime?: Lifetime): ServiceDescriptor<T> => ({
  implementation,
  cacheKey: Symbol(implementation.name),
  lifetime,
  createInstance: () => new implementation(),
  usesFactory: true,
  isAsync: true,
});

const syncDescriptor = <T extends SourceType>(implementation: ServiceImplementation<T>, lifetime?: Lifetime): ServiceDescriptor<T> => ({
  implementation,
  cacheKey: Symbol(implementation.name),
  lifetime,
  createInstance: () => new implementation(),
  usesFactory: true,
  isAsync: false,
});

const mapOf = (...entries: readonly [ServiceIdentifier<SourceType>, ServiceDescriptor<SourceType>][]): DescriptorMap => {
  const map = createDescriptorMap();
  for (const [identifier, descriptor] of entries) {
    const bucket = map.get(identifier) ?? [];
    bucket.push(descriptor);
    map.set(identifier, bucket);
  }
  return map;
};

abstract class IResource {}
class Resource implements IResource {}

describe('asyncThroughSyncPathPolicy', () => {
  it('flags an async factory registered under the default lifetime', () => {
    const graph = deriveFacts(mapOf([IResource, asyncDescriptor(Resource)]));
    const expected = [ValidationProblemKind.AsyncThroughSyncPath];

    const actual = asyncThroughSyncPathPolicy(graph).map((problem) => problem.kind);

    expect(actual).toEqual(expected);
  });

  it('flags an async factory registered as transient', () => {
    const graph = deriveFacts(mapOf([IResource, asyncDescriptor(Resource, Lifetime.Transient)]));
    const expected = [ValidationProblemKind.AsyncThroughSyncPath];

    const actual = asyncThroughSyncPathPolicy(graph).map((problem) => problem.kind);

    expect(actual).toEqual(expected);
  });

  it('flags an async factory registered as resolve', () => {
    const graph = deriveFacts(mapOf([IResource, asyncDescriptor(Resource, Lifetime.Resolve)]));
    const expected = [ValidationProblemKind.AsyncThroughSyncPath];

    const actual = asyncThroughSyncPathPolicy(graph).map((problem) => problem.kind);

    expect(actual).toEqual(expected);
  });

  it('does not flag an async factory registered as a singleton — the build boundary awaits it', () => {
    const graph = deriveFacts(mapOf([IResource, asyncDescriptor(Resource, Lifetime.Singleton)]));
    const expected: ValidationProblemKind[] = [];

    const actual = asyncThroughSyncPathPolicy(graph).map((problem) => problem.kind);

    expect(actual).toEqual(expected);
  });

  it('does not flag a synchronous factory under a non-singleton lifetime', () => {
    const graph = deriveFacts(mapOf([IResource, syncDescriptor(Resource, Lifetime.Resolve)]));
    const expected: ValidationProblemKind[] = [];

    const actual = asyncThroughSyncPathPolicy(graph).map((problem) => problem.kind);

    expect(actual).toEqual(expected);
  });
});
