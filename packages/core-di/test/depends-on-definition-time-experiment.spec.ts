/**
 * Definition-time @dependsOn investigation — EXPERIMENT (evidence, not production code).
 *
 * Crux: can @dependsOn record its edges WITHOUT the class ever being
 * constructed? The current decorator defers its work into the returned
 * per-instance field initializer because `this.constructor` is only reachable
 * there. The escape is `ctx.metadata` (stage-3 decorator metadata): the
 * decorator body runs at class DEFINITION time, `ctx.metadata` is writable
 * right there, and the engine attaches it to the class as
 * `ClassCtor[Symbol.metadata]`. Each `describe` below is one experiment;
 * a green run is the finding.
 */
import { describe, expect, it } from 'vitest';
import type { ServiceIdentifier, SourceType } from '../src/types';

// V8 does not ship Symbol.metadata yet; TS's emitted decorator plumbing
// looks it up, so it must exist before any decorated class is evaluated.
const MetadataKey: symbol = ((Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata'));

const DepsKey = Symbol.for('design:dependencies');

type DepsRecord = Record<string | symbol, ServiceIdentifier<SourceType>>;

/**
 * The prototype decorator. Identical call-site shape to the real `dependsOn`,
 * but all work happens in the decorator body (definition time) via
 * `ctx.metadata` — the returned initializer is gone entirely.
 */
const dependsOn = <T extends SourceType>(identifier: ServiceIdentifier<T>) => {
  return (_value: undefined, ctx: ClassFieldDecoratorContext): void => {
    // ctx.metadata is typed optional (undefined when Symbol.metadata is
    // missing at class-evaluation time); the polyfill above guarantees it here.
    const meta = ctx.metadata;
    if (meta === undefined) {
      throw new Error('Symbol.metadata is not installed');
    }
    const existing = meta[DepsKey] as DepsRecord | undefined;
    // ctx.metadata inherits prototypically from the parent class's metadata.
    // Own-check so a subclass gets its own record layered over the parent's
    // rather than mutating the parent's edges.
    if (existing === undefined || !Object.hasOwn(meta, DepsKey)) {
      meta[DepsKey] = { ...existing };
    }
    (meta[DepsKey] as DepsRecord)[ctx.name] = identifier;
  };
};

/** Read a class's declared edges — no instance anywhere near this. */
const getDeclaredDeps = (ctor: abstract new (...args: never[]) => unknown): DepsRecord | undefined => {
  return (ctor as unknown as Record<symbol, Record<symbol, unknown> | undefined>)[MetadataKey]?.[DepsKey] as DepsRecord | undefined;
};

// ---------------------------------------------------------------------------
// E1 — edges exist at class DEFINITION time, before any construction.
// This is the direct counterpart of the lazy-spine experiment's E1, with the
// expectation inverted: metadata is populated the moment the class statement
// is evaluated.
// ---------------------------------------------------------------------------
describe('E1: ctx.metadata records edges without construction', () => {
  it('edges are readable from the class before any instance exists', () => {
    abstract class IDep {}
    abstract class ISvc {}
    class Svc implements ISvc {
      @dependsOn(IDep) private readonly dep!: IDep;
    }

    // No `new Svc()` anywhere — the edge is already on the class.
    const edges = getDeclaredDeps(Svc) ?? {};
    expect(Object.values(edges)).toContain(IDep);
  });

  it('multiple fields all land in the same record', () => {
    abstract class IA {}
    abstract class IB {}
    class Svc {
      @dependsOn(IA) private readonly a!: IA;
      @dependsOn(IB) private readonly b!: IB;
    }

    const edges = getDeclaredDeps(Svc) ?? {};
    expect(Object.values(edges)).toEqual([IA, IB]);
  });
});

// ---------------------------------------------------------------------------
// E2 — inheritance: a subclass sees its own edges plus the parent's, and the
// parent's record is not polluted by the subclass. This is the subtlety the
// prototypal inheritance of ctx.metadata introduces.
// ---------------------------------------------------------------------------
describe('E2: subclass metadata layers over the parent without mutating it', () => {
  abstract class IBase {}
  abstract class IExtra {}

  class Base {
    @dependsOn(IBase) protected readonly base!: IBase;
  }
  class Derived extends Base {
    @dependsOn(IExtra) private readonly extra!: IExtra;
  }

  it('derived sees both edges', () => {
    const edges = getDeclaredDeps(Derived) ?? {};
    expect(Object.values(edges)).toEqual(expect.arrayContaining([IBase, IExtra]));
  });

  it('base sees only its own edge', () => {
    const edges = getDeclaredDeps(Base) ?? {};
    expect(Object.values(edges)).toEqual([IBase]);
  });
});

// ---------------------------------------------------------------------------
// E3 — the consequence for the container: with edges on the class, a full
// dependency graph is derivable at register() time, statically. This models
// what validate()/buildProvider() could do: walk declared edges from each
// registration into a DAG, with zero probe-construction.
// ---------------------------------------------------------------------------
describe('E3: a static DAG is derivable from declared edges alone', () => {
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
      @dependsOn(IRepo) private readonly repo!: IRepo;
      constructor() {
        constructions++;
      }
    }
    class Controller implements IController {
      @dependsOn(IService) private readonly service!: IService;
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

    // Static topological sort over declared edges — no instances.
    const order: ServiceIdentifier<SourceType>[] = [];
    const visited = new Set<ServiceIdentifier<SourceType>>();
    const visit = (face: ServiceIdentifier<SourceType>) => {
      if (visited.has(face)) return;
      visited.add(face);
      const impl = registrations.get(face);
      if (impl === undefined) return;
      for (const dep of Object.values(getDeclaredDeps(impl) ?? {})) {
        visit(dep);
      }
      order.push(face);
    };
    for (const face of registrations.keys()) {
      visit(face);
    }

    expect(order).toEqual([IRepo, IService, IController]);
    expect(constructions).toBe(0);
  });
});
