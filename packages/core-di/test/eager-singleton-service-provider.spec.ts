import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IResolutionScope, IServiceProvider } from '../src';

class Warmup {
  @dependsOn(IServiceProvider) provider!: IServiceProvider;
}

class WarmupScope {
  @dependsOn(IResolutionScope) scope!: IResolutionScope;
}

describe('eager singleton depending on IServiceProvider', () => {
  it('receives the resolved provider when built lazily (baseline)', () => {
    const services = createServiceCollection();
    services.register(Warmup).asSelf().singleton();

    const provider = services.buildProvider();
    const warmup = provider.resolve(Warmup);

    expect(warmup.provider).toBe(provider);
  });

  it('receives the resolved provider when constructed eagerly at buildProvider', () => {
    const services = createServiceCollection();
    services.register(Warmup).asSelf().singleton().eager();

    const provider = services.buildProvider();
    const warmup = provider.resolve(Warmup);

    expect(warmup.provider).toBe(provider);
  });

  it('receives the resolved provider when constructed eagerly at buildProviderAsync', async () => {
    const services = createServiceCollection({ async: true });
    services.register(Warmup).asSelf().singleton().eager();

    const provider = await services.buildProviderAsync();
    const warmup = provider.resolve(Warmup);

    expect(warmup.provider).toBe(provider);
  });
});

describe('eager singleton depending on IResolutionScope', () => {
  it('receives a working scope when constructed eagerly at buildProvider', () => {
    const services = createServiceCollection();
    services.register(WarmupScope).asSelf().singleton().eager();

    const provider = services.buildProvider();
    const warmup = provider.resolve(WarmupScope);

    expect(warmup.scope).toBe(provider);
  });
});
