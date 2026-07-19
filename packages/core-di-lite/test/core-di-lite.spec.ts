import { beforeEach, describe, expect, it } from 'vitest';
import { CircularDependencyError, createServiceCollection, dependsOn, MultipleRegistrationError, ServiceCreationError, UnregisteredServiceError } from '../src';

// Lite is the focused composition of the shared engine: everything is a
// singleton, everything constructs at buildProvider (fail fast), and a resolve
// afterwards is a pure lookup. These specs pin that, plus the two gaps that
// motivated the redesign: shared identity across faces once a factory is
// involved, and forwarding one declaration to another.

let constructed: string[] = [];
const track = (name: string): void => {
  constructed.push(name);
};
const countOf = (name: string): number => constructed.filter((entry) => entry === name).length;

beforeEach(() => {
  constructed = [];
});

abstract class ILogger {
  abstract log(message: string): void;
}
abstract class IAuditSink {
  abstract log(message: string): void;
}
class ConsoleLogger implements ILogger, IAuditSink {
  constructor() {
    track('ConsoleLogger');
  }
  log(_message: string): void {}
}

abstract class IGreeter {
  abstract greet(): string;
}
class Greeter implements IGreeter {
  constructor(private readonly logger: ILogger) {
    track('Greeter');
  }
  greet(): string {
    this.logger.log('greeting');
    return 'hello';
  }
}

abstract class IDecorated {}
class Decorated implements IDecorated {
  @dependsOn(ILogger) public readonly logger!: ILogger;
  constructor() {
    track('Decorated');
  }
}

abstract class IBoom {}
class Boom implements IBoom {
  constructor() {
    throw new Error('boom');
  }
}

describe('shared identity across faces (the 4.x gap)', () => {
  it('resolves one instance for two faces declared from one register call', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger).as(IAuditSink).singleton();
    const provider = services.buildProvider();
    const expected = provider.resolve(ILogger);

    const actual = provider.resolve(IAuditSink);

    expect(actual).toBe(expected);
  });

  it('keeps shared identity when the instance comes from a factory', () => {
    const services = createServiceCollection();
    services
      .register(ConsoleLogger)
      .using(() => new ConsoleLogger())
      .as(ILogger)
      .as(IAuditSink);
    const provider = services.buildProvider();
    const expected = provider.resolve(ILogger);

    const actual = provider.resolve(IAuditSink);

    expect(actual).toBe(expected);
  });

  it('constructs the shared instance once, not once per face', () => {
    const expected = 1;
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger).as(IAuditSink);
    services.buildProvider();

    const actual = countOf('ConsoleLogger');

    expect(actual).toBe(expected);
  });

  it('gives separate register calls separate instances even for one implementation', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services.register(ConsoleLogger).as(IAuditSink);
    const provider = services.buildProvider();
    const first = provider.resolve(ILogger);

    const actual = provider.resolve(IAuditSink);

    expect(actual).not.toBe(first);
  });
});

describe('forwarding (the other 4.x gap)', () => {
  it('resolves a forwarded token to the target registration instance', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services.forward(IAuditSink).to(ILogger);
    const provider = services.buildProvider();
    const expected = provider.resolve(ILogger);

    const actual = provider.resolve(IAuditSink);

    expect(actual).toBe(expected);
  });
});

describe('eager singleton build: pay resolution once, at buildProvider', () => {
  it('constructs every registration at build, before any resolve', () => {
    const expected = 1;
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services.buildProvider();

    const actual = countOf('ConsoleLogger');

    expect(actual).toBe(expected);
  });

  it('resolves as a pure lookup, constructing nothing more', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    const provider = services.buildProvider();
    const expected = countOf('ConsoleLogger');

    provider.resolve(ILogger);
    const actual = countOf('ConsoleLogger');

    expect(actual).toBe(expected);
  });

  it('shares the un-verbed registration as a singleton: the composed default', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    const provider = services.buildProvider();
    const expected = provider.resolve(ILogger);

    const actual = provider.resolve(ILogger);

    expect(actual).toBe(expected);
  });
});

describe('fail fast at buildProvider', () => {
  it('throws at build when a constructor fails', () => {
    const services = createServiceCollection();
    services.register(Boom).as(IBoom);

    const actual = () => services.buildProvider();

    expect(actual).toThrow(ServiceCreationError);
  });

  it('throws at build when a declared dependency is unregistered', () => {
    const services = createServiceCollection();
    services.register(Decorated).as(IDecorated);

    const actual = () => services.buildProvider();

    expect(actual).toThrow(UnregisteredServiceError);
  });

  it('throws at build on a dependency cycle', () => {
    abstract class ICycleA {}
    abstract class ICycleB {}
    class CycleA implements ICycleA {
      @dependsOn(ICycleB) public readonly b!: ICycleB;
    }
    class CycleB implements ICycleB {
      @dependsOn(ICycleA) public readonly a!: ICycleA;
    }
    const services = createServiceCollection();
    services.register(CycleA).as(ICycleA);
    services.register(CycleB).as(ICycleB);

    const actual = () => services.buildProvider();

    expect(actual).toThrow(CircularDependencyError);
  });
});

describe('wiring', () => {
  it('injects a constructor dependency through a declared-deps factory', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services
      .register(Greeter)
      .using([ILogger], (logger) => new Greeter(logger))
      .as(IGreeter);
    const provider = services.buildProvider();
    const expected = 'hello';

    const actual = provider.resolve(IGreeter).greet();

    expect(actual).toBe(expected);
  });

  it('injects a @dependsOn field', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services.register(Decorated).as(IDecorated);
    const provider = services.buildProvider();
    const expected = provider.resolve(ILogger);

    const actual = (provider.resolve(IDecorated) as Decorated).logger;

    expect(actual).toBe(expected);
  });

  it('throws UnregisteredServiceError for an unregistered token at resolve', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    const provider = services.buildProvider();

    const actual = () => provider.resolve(IGreeter);

    expect(actual).toThrow(UnregisteredServiceError);
  });
});

describe('multiplicity', () => {
  it('throws MultipleRegistrationError when resolve meets two registrations of one token', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services.register(ConsoleLogger).as(ILogger);
    const provider = services.buildProvider();

    const actual = () => provider.resolve(ILogger);

    expect(actual).toThrow(MultipleRegistrationError);
  });

  it('resolveAll returns one instance per registration', () => {
    const expected = 2;
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services.register(ConsoleLogger).as(ILogger);
    const provider = services.buildProvider();

    const actual = provider.resolveAll(ILogger).length;

    expect(actual).toBe(expected);
  });
});

describe('the focused surface', () => {
  it('exposes no lifetime verb beyond singleton', () => {
    const services = createServiceCollection();

    const builder = services.register(ConsoleLogger).as(ILogger) as unknown as Record<string, unknown>;
    const actual = { scoped: builder.scoped, resolve: builder.resolve, transient: builder.transient };

    expect(actual).toEqual({ scoped: undefined, resolve: undefined, transient: undefined });
  });

  it('rejects an uncomposed verb at compile time', () => {
    const services = createServiceCollection();

    // @ts-expect-error - lite composes only the singleton lifetime; there is no scoped verb
    services.register(ConsoleLogger).as(ILogger).scoped;
  });

  it('reports unregistered dependencies through validate() without constructing', () => {
    const services = createServiceCollection();
    services.register(Decorated).as(IDecorated);

    const report = services.validate();

    expect(report.valid).toBe(false);
    expect(countOf('Decorated')).toBe(0);
  });

  it('passes validate() for a well-wired collection', () => {
    const services = createServiceCollection();
    services.register(ConsoleLogger).as(ILogger);
    services.register(Decorated).as(IDecorated);

    const actual = services.validate().valid;

    expect(actual).toBe(true);
  });
});
