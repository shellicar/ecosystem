import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, IServiceProvider } from '../src';

class Warmup {
  @dependsOn(IServiceProvider) provider!: IServiceProvider;
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
});
