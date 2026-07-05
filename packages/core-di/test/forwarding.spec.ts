import { describe, expect, it } from 'vitest';
import { createServiceCollection } from '../src';

// Problem 2, from the CLI composition root: a factory-built service composes
// several dependencies, and one instance is shared through a separate contract.
// forwardTo declares that edge directly, rather than expressing the alias as a
// factory body (`register(IToolProvider).to(IToolProvider, x => x.resolve(...))`).
abstract class IToolProvider {
  abstract tools(): string[];
}

class AppToolsService implements IToolProvider {
  constructor(public readonly build: number) {}
  tools(): string[] {
    return ['a', 'b'];
  }
}

describe('Forwarding one declaration to another', () => {
  it('forwards a token to a registration, sharing one instance', () => {
    let builds = 0;
    const services = createServiceCollection();
    services
      .register(AppToolsService)
      .using(() => new AppToolsService(++builds))
      .asSelf()
      .singleton();
    services.register(IToolProvider).forwardTo(AppToolsService);
    const provider = services.buildProvider();

    const expected = provider.resolve(AppToolsService);
    const actual = provider.resolve(IToolProvider);

    expect(actual).toBe(expected);
  });

  it('runs the target factory once across the forward', () => {
    let builds = 0;
    const services = createServiceCollection();
    services
      .register(AppToolsService)
      .using(() => new AppToolsService(++builds))
      .asSelf()
      .singleton();
    services.register(IToolProvider).forwardTo(AppToolsService);
    const provider = services.buildProvider();

    provider.resolve(AppToolsService);
    provider.resolve(IToolProvider);

    expect(builds).toBe(1);
  });
});

// Direction set by the SC: forwards form a DAG, so a forward may target another
// forward (multi-hop), and the chain resolves to the one terminal instance.
describe('Multi-hop forwarding (a forward targeting another forward)', () => {
  abstract class IFoo {}
  abstract class IBar {}
  class Foo implements IFoo, IBar {}

  it('resolves a chain of forwards to the one terminal instance', () => {
    const services = createServiceCollection();
    services.register(Foo).asSelf().singleton();
    services.register(IBar).forwardTo(Foo);
    services.register(IFoo).forwardTo(IBar);
    const provider = services.buildProvider();

    const expected = provider.resolve(Foo);
    const actual = provider.resolve(IFoo);

    expect(actual).toBe(expected);
  });
});
