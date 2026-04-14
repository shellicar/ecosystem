import { describe, expect, it } from 'vitest';
import { CircularDependencyError, createServiceCollection, DuplicateRegistrationError, dependsOn, ServiceCreationError, UnregisteredServiceError } from '../src';

// Registration and resolution
abstract class IFoo {
  abstract value(): string;
}
class Foo implements IFoo {
  value() {
    return 'foo';
  }
}
abstract class IBar {
  abstract value(): string;
}
class Bar implements IBar {
  constructor(private readonly foo: IFoo) {}
  value() {
    return `bar:${this.foo.value()}`;
  }
}
abstract class IBarExposing {
  abstract getFoo(): IFoo;
}
class BarExposing implements IBarExposing {
  constructor(private readonly foo: IFoo) {}
  getFoo() {
    return this.foo;
  }
}

// @dependsOn decorator
abstract class IDep {
  abstract check(): string;
}
class Dep implements IDep {
  check() {
    return 'dep';
  }
}

// Symbol-keyed @dependsOn
const symField = Symbol('dep');
abstract class IWithSymbolDep {
  abstract run(): string;
}
class WithSymbolDep implements IWithSymbolDep {
  @dependsOn(IDep) readonly [symField]!: IDep;
  run() {
    return this[symField]?.check() ?? 'not injected';
  }
}
abstract class IWithOneDep {
  abstract run(): string;
}
class WithOneDep implements IWithOneDep {
  @dependsOn(IDep) private readonly dep!: IDep;
  run() {
    return this.dep.check();
  }
}

abstract class IDepA {
  abstract a(): string;
}
class DepA implements IDepA {
  a() {
    return 'a';
  }
}
abstract class IDepB {
  abstract b(): string;
}
class DepB implements IDepB {
  b() {
    return 'b';
  }
}
abstract class IWithTwoDeps {
  abstract run(): string;
}
class WithTwoDeps implements IWithTwoDeps {
  @dependsOn(IDepA) private readonly depA!: IDepA;
  @dependsOn(IDepB) private readonly depB!: IDepB;
  run() {
    return `${this.depA.a()}${this.depB.b()}`;
  }
}

// Chained dependencies: A -> B -> C
abstract class IC {
  abstract value(): string;
}
class C implements IC {
  value() {
    return 'c';
  }
}
abstract class IB {
  abstract value(): string;
}
class B implements IB {
  @dependsOn(IC) private readonly c!: IC;
  value() {
    return `b:${this.c.value()}`;
  }
}
abstract class IA {
  abstract value(): string;
}
class A implements IA {
  @dependsOn(IB) private readonly b!: IB;
  value() {
    return `a:${this.b.value()}`;
  }
}

// Eager build and singleton
abstract class ICountedService {
  abstract value(): string;
}
class CountedService implements ICountedService {
  value() {
    return 'x';
  }
}

// Circular dependency
abstract class ICycleA {
  abstract value(): string;
}
abstract class ICycleB {
  abstract value(): string;
}
class CycleA implements ICycleA {
  @dependsOn(ICycleB) private readonly b!: ICycleB;
  value() {
    return 'a';
  }
}
class CycleB implements ICycleB {
  @dependsOn(ICycleA) private readonly a!: ICycleA;
  value() {
    return 'b';
  }
}

abstract class ISelfRef {
  abstract value(): string;
}
class SelfRef implements ISelfRef {
  @dependsOn(ISelfRef) private readonly self!: ISelfRef;
  value() {
    return 'self';
  }
}

// Factory and decorator combination
abstract class IFactoryFoo {
  abstract foo(): string;
}
class FactoryFoo implements IFactoryFoo {
  foo() {
    return 'foo';
  }
}
abstract class IDecorated {
  abstract result(): string;
}
class Decorated implements IDecorated {
  @dependsOn(IFactoryFoo) private readonly factoryFoo!: IFactoryFoo;
  private readonly extra: string;
  constructor(extra: string) {
    this.extra = extra;
  }
  result() {
    return `${this.extra}:${this.factoryFoo.foo()}`;
  }
}

describe('Registration and resolution', () => {
  it('resolves a registered service', () => {
    const services = createServiceCollection();
    services.register(IFoo).to(Foo);
    const provider = services.buildProvider();
    const actual = provider.resolve(IFoo).value();
    const expected = 'foo';
    expect(actual).toBe(expected);
  });

  it('resolves a service registered with a factory', () => {
    const services = createServiceCollection();
    services.register(IFoo).to(Foo);
    services.register(IBar).to(IBar, (x) => new Bar(x.resolve(IFoo)));
    const provider = services.buildProvider();
    const actual = provider.resolve(IBar).value();
    const expected = 'bar:foo';
    expect(actual).toBe(expected);
  });

  it('factory receives a resolution scope that can resolve other services', () => {
    const services = createServiceCollection();
    services.register(IFoo).to(Foo);
    let captured: IFoo | undefined;
    services.register(IBar).to(IBar, (x) => {
      captured = x.resolve(IFoo);
      return new Bar(captured);
    });
    services.buildProvider();
    const actual = captured instanceof Foo;
    const expected = true;
    expect(actual).toBe(expected);
  });

  it('throws UnregisteredServiceError for unresolved identifier', () => {
    const services = createServiceCollection();
    const provider = services.buildProvider();
    const actual = () => provider.resolve(IFoo);
    expect(actual).toThrow(UnregisteredServiceError);
  });
});

describe('@dependsOn decorator', () => {
  it('injects dependency via @dependsOn', () => {
    const services = createServiceCollection();
    services.register(IDep).to(Dep);
    services.register(IWithOneDep).to(WithOneDep);
    const provider = services.buildProvider();
    const actual = provider.resolve(IWithOneDep).run();
    const expected = 'dep';
    expect(actual).toBe(expected);
  });

  it('injects multiple dependencies via multiple @dependsOn fields', () => {
    const services = createServiceCollection();
    services.register(IDepA).to(DepA);
    services.register(IDepB).to(DepB);
    services.register(IWithTwoDeps).to(WithTwoDeps);
    const provider = services.buildProvider();
    const actual = provider.resolve(IWithTwoDeps).run();
    const expected = 'ab';
    expect(actual).toBe(expected);
  });

  it('chains through nested @dependsOn (A depends on B, B depends on C)', () => {
    const services = createServiceCollection();
    services.register(IC).to(C);
    services.register(IB).to(B);
    services.register(IA).to(A);
    const provider = services.buildProvider();
    const actual = provider.resolve(IA).value();
    const expected = 'a:b:c';
    expect(actual).toBe(expected);
  });
});

describe('Eager build', () => {
  it('all services are instantiated at buildProvider() (factory called during build, not on resolve)', () => {
    let callCount = 0;
    const services = createServiceCollection();
    services.register(ICountedService).to(ICountedService, () => {
      callCount++;
      return new CountedService();
    });
    services.buildProvider();
    const actual = callCount;
    const expected = 1;
    expect(actual).toBe(expected);
  });

  it('factory call count is exactly one per registration (singleton)', () => {
    let callCount = 0;
    const services = createServiceCollection();
    services.register(ICountedService).to(ICountedService, () => {
      callCount++;
      return new CountedService();
    });
    const provider = services.buildProvider();
    provider.resolve(ICountedService);
    provider.resolve(ICountedService);
    const actual = callCount;
    const expected = 1;
    expect(actual).toBe(expected);
  });
});

describe('Singleton behavior', () => {
  it('same instance returned on multiple resolve() calls', () => {
    const services = createServiceCollection();
    services.register(IFoo).to(Foo);
    const provider = services.buildProvider();
    const actual = provider.resolve(IFoo);
    const expected = provider.resolve(IFoo);
    expect(actual).toBe(expected);
  });

  it('same instance returned when resolved via different code paths', () => {
    const services = createServiceCollection();
    services.register(IFoo).to(Foo);
    services.register(IBarExposing).to(IBarExposing, (x) => new BarExposing(x.resolve(IFoo)));
    const provider = services.buildProvider();
    const fooDirectly = provider.resolve(IFoo);
    const fooViaBar = provider.resolve(IBarExposing).getFoo();
    expect(fooDirectly).toBe(fooViaBar);
  });
});

describe('Circular dependency detection', () => {
  it('throws CircularDependencyError for A -> B -> A', () => {
    const services = createServiceCollection();
    services.register(ICycleA).to(CycleA);
    services.register(ICycleB).to(CycleB);
    const actual = () => services.buildProvider();
    expect(actual).toThrow(CircularDependencyError);
  });

  it('throws CircularDependencyError for self-dependency', () => {
    const services = createServiceCollection();
    services.register(ISelfRef).to(SelfRef);
    const actual = () => services.buildProvider();
    expect(actual).toThrow(CircularDependencyError);
  });
});

describe('Factory and decorator combination', () => {
  it('factory creates instance, @dependsOn injects additional dependencies on the same instance', () => {
    const services = createServiceCollection();
    services.register(IFactoryFoo).to(FactoryFoo);
    services.register(IDecorated).to(IDecorated, () => new Decorated('extra'));
    const provider = services.buildProvider();
    const actual = provider.resolve(IDecorated).result();
    const expected = 'extra:foo';
    expect(actual).toBe(expected);
  });
});

describe('Duplicate registration', () => {
  it('throws DuplicateRegistrationError when the same identifier is registered twice', () => {
    const services = createServiceCollection();
    services.register(IFoo).to(Foo);
    const actual = () => services.register(IFoo).to(Foo);
    expect(actual).toThrow(DuplicateRegistrationError);
  });
});

describe('Service creation errors', () => {
  it('wraps factory errors in ServiceCreationError', () => {
    const services = createServiceCollection();
    services.register(IFoo).to(IFoo, () => {
      throw new TypeError('boom');
    });
    const actual = () => services.buildProvider();
    expect(actual).toThrow(ServiceCreationError);
  });
});

describe('@dependsOn with symbol-keyed field', () => {
  it('injects symbol-keyed dependencies', () => {
    const services = createServiceCollection();
    services.register(IDep).to(Dep);
    services.register(IWithSymbolDep).to(WithSymbolDep);
    const provider = services.buildProvider();
    const actual = provider.resolve(IWithSymbolDep).run();
    const expected = 'dep';
    expect(actual).toBe(expected);
  });
});

describe('Registration-order independence', () => {
  it('resolves correctly when services are registered in reverse dependency order', () => {
    const services = createServiceCollection();
    services.register(IA).to(A);
    services.register(IB).to(B);
    services.register(IC).to(C);
    const provider = services.buildProvider();
    const actual = provider.resolve(IA).value();
    const expected = 'a:b:c';
    expect(actual).toBe(expected);
  });
});

describe('@dependsOn with unregistered dependency', () => {
  it('throws UnregisteredServiceError at build time when @dependsOn references an unregistered service', () => {
    const services = createServiceCollection();
    services.register(IWithOneDep).to(WithOneDep);
    const actual = () => services.buildProvider();
    expect(actual).toThrow(UnregisteredServiceError);
  });
});
