import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IScopedProvider, ValidationProblemKind } from '../src';

class ScopeConsumer {
  @dependsOn(IScopedProvider) public readonly scope!: IScopedProvider;
}

// The engine binds IScopedProvider itself, so the edge is never a missing target.
// What validate() has to say instead is whether the consumer can honestly receive
// a scope: a scoped one always can, and a singleton never can, whichever boundary
// constructs it.
describe('validate() on a dependency edge onto IScopedProvider', () => {
  it('says nothing about a scoped consumer, which always receives its own scope', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().scoped();

    const expected = { valid: true, errors: [], warnings: [] };
    const actual = services.validate();

    expect(actual).toEqual(expected);
  });

  it('errors on a singleton consumer, which no boundary can ever serve', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().singleton();

    const expected = [ValidationProblemKind.ScopeMismatch];
    const actual = services.validate().errors.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });

  it('is invalid for a singleton consumer: the registration can never construct', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().singleton();

    const actual = services.validate().valid;

    expect(actual).toBe(false);
  });

  it('stays valid for a transient consumer, which a scope serves correctly', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().transient();

    const actual = services.validate().valid;

    expect(actual).toBe(true);
  });

  it('warns about a transient consumer, which receives the root provider when resolved from the root', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().transient();

    const expected = [ValidationProblemKind.ScopeMismatch];
    const actual = services.validate().warnings.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });

  it('warns about a resolve-lifetime consumer, which receives the root provider when resolved from the root', () => {
    const services = createServiceCollection();
    services.register(ScopeConsumer).asSelf().resolve();

    const expected = [ValidationProblemKind.ScopeMismatch];
    const actual = services.validate().warnings.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });
});
