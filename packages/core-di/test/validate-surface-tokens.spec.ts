import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IResolutionScope, IScopedProvider, IServiceProvider } from '../src';

abstract class INeedsProvider {
  abstract provider: IServiceProvider;
}
class NeedsProvider extends INeedsProvider {
  @dependsOn(IServiceProvider) public readonly provider!: IServiceProvider;
}

abstract class INeedsScopedProvider {
  abstract provider: IScopedProvider;
}
class NeedsScopedProvider extends INeedsScopedProvider {
  @dependsOn(IScopedProvider) public readonly provider!: IScopedProvider;
}

abstract class INeedsResolutionScope {
  abstract scope: IResolutionScope;
}
class NeedsResolutionScope extends INeedsResolutionScope {
  @dependsOn(IResolutionScope) public readonly scope!: IResolutionScope;
}

describe('validate() and engine-bound surface tokens', () => {
  it('does not report IServiceProvider as a missing target: the engine binds it, it is never registered', () => {
    const services = createServiceCollection();
    services.register(NeedsProvider).asSelf();

    const expected = { valid: true, problems: [] };
    const actual = services.validate();

    expect(actual).toEqual(expected);
  });

  it('does not report IScopedProvider as a missing target: the engine binds it, it is never registered', () => {
    const services = createServiceCollection();
    services.register(NeedsScopedProvider).asSelf();

    const expected = { valid: true, problems: [] };
    const actual = services.validate();

    expect(actual).toEqual(expected);
  });

  it('does not report IResolutionScope as a missing target: the engine binds it, it is never registered', () => {
    const services = createServiceCollection();
    services.register(NeedsResolutionScope).asSelf();

    const expected = { valid: true, problems: [] };
    const actual = services.validate();

    expect(actual).toEqual(expected);
  });
});
