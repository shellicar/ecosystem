/**
 * `@dependsOn` records its edges at class-definition time via `ctx.metadata`,
 * so they are readable off the class with zero construction. Promoted from
 * `depends-on-definition-time-experiment.spec.ts` (now retired) onto the
 * shipped `dependsOn` decorator and `getMetadata`.
 */
import { describe, expect, it } from 'vitest';
import { dependsOn } from '../src/dependsOn';
import { DesignDependenciesKey } from '../src/private/constants';
import { getMetadata } from '../src/private/metadata';
import type { ServiceIdentifier, SourceType } from '../src/types';

const getDeclaredDeps = (ctor: object) => getMetadata<SourceType>(DesignDependenciesKey, ctor) ?? {};

describe('edges are recorded without construction', () => {
  it('a field edge is readable from the class before any instance exists', () => {
    abstract class IDep {}
    class Svc {
      @dependsOn(IDep) public readonly dep!: IDep;
    }

    const actual = Object.values(getDeclaredDeps(Svc));

    expect(actual).toContain(IDep);
  });

  it('multiple fields all land in the same record', () => {
    abstract class IA {}
    abstract class IB {}
    class Svc {
      @dependsOn(IA) public readonly a!: IA;
      @dependsOn(IB) public readonly b!: IB;
    }

    const expected = [IA, IB];

    const actual = Object.values(getDeclaredDeps(Svc));

    expect(actual).toEqual(expected);
  });
});

describe('subclass metadata layers over the parent without mutating it', () => {
  abstract class IBase {}
  abstract class IExtra {}

  class Base {
    @dependsOn(IBase) protected readonly base!: IBase;
  }
  class Derived extends Base {
    @dependsOn(IExtra) public readonly extra!: IExtra;
  }

  it('derived sees both its own edge and the inherited one', () => {
    const actual = Object.values(getDeclaredDeps(Derived));

    expect(actual).toEqual(expect.arrayContaining([IBase, IExtra]));
  });

  it('base sees only its own edge', () => {
    const expected = [IBase];

    const actual = Object.values(getDeclaredDeps(Base));

    expect(actual).toEqual(expected);
  });
});

describe('a static DAG is derivable from declared edges alone', () => {
  it('topologically orders a three-node chain without constructing anything', () => {
    abstract class IRepo {}
    abstract class IService {}
    abstract class IController {}

    let constructions = 0;
    class Repo implements IRepo {
      constructor() {
        constructions++;
      }
    }
    class Service implements IService {
      @dependsOn(IRepo) public readonly repo!: IRepo;
      constructor() {
        constructions++;
      }
    }
    class Controller implements IController {
      @dependsOn(IService) public readonly service!: IService;
      constructor() {
        constructions++;
      }
    }

    // The "registrations": face -> implementation, as a collection holds them.
    const registrations = new Map<ServiceIdentifier<SourceType>, new () => unknown>([
      [IRepo, Repo],
      [IService, Service],
      [IController, Controller],
    ]);

    // Static topological sort over declared edges: no instances.
    const order: ServiceIdentifier<SourceType>[] = [];
    const visited = new Set<ServiceIdentifier<SourceType>>();
    const visit = (face: ServiceIdentifier<SourceType>) => {
      if (visited.has(face)) {
        return;
      }
      visited.add(face);
      const impl = registrations.get(face);
      if (impl === undefined) {
        return;
      }
      for (const dep of Object.values(getDeclaredDeps(impl))) {
        visit(dep);
      }
      order.push(face);
    };
    for (const face of registrations.keys()) {
      visit(face);
    }

    const expected = [IRepo, IService, IController];

    expect(order).toEqual(expected);
    expect(constructions).toBe(0);
  });
});

describe('the Symbol.metadata polyfill installs before any decorated class evaluates', () => {
  it('is present when a consumer imports only the barrel', async () => {
    const barrel = await import('../src/index');

    // A decorated class defined right here, in a file whose only import of
    // the library is the barrel: if the polyfill were not installed before
    // this module finished evaluating, this decoration would already have
    // thrown at module-load time, and this test would never run.
    abstract class IThing {}
    class Consumer {
      @barrel.dependsOn(IThing) public readonly thing!: IThing;
    }

    const actual = Object.values(getDeclaredDeps(Consumer));

    expect(actual).toContain(IThing);
  });

  it('is present via the explicit /polyfill + /dependsOn subpaths', async () => {
    await import('../src/polyfill');
    const { dependsOn: dependsOnSubpath } = await import('../src/dependsOn');

    abstract class IThing {}
    class Consumer {
      @dependsOnSubpath(IThing) public readonly thing!: IThing;
    }

    const actual = Object.values(getDeclaredDeps(Consumer));

    expect(actual).toContain(IThing);
  });
});
