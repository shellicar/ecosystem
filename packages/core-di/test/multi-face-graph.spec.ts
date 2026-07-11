import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn, ValidationProblemKind } from '../src';

// A node registered under several faces (one register() call, several as/asSelf)
// is ONE descriptor. The static graph must reach it through every face: an edge
// naming an earlier face is a real edge, visible to validate() and cycle detection.

describe('multi-face registrations in the static graph', () => {
  it('reports valid wiring when a dependency names an earlier face', () => {
    abstract class IFace {}
    class Concrete implements IFace {}
    class Dependent {
      @dependsOn(IFace) private readonly face!: IFace;
    }
    const services = createServiceCollection();
    services.register(Concrete).as(IFace).asSelf();
    services.register(Dependent).asSelf().singleton();

    const actual = services.validate().valid;

    expect(actual).toBe(true);
  });

  it('emits no false MissingTarget for an edge naming an earlier face', () => {
    abstract class IFace {}
    class Concrete implements IFace {}
    class Dependent {
      @dependsOn(IFace) private readonly face!: IFace;
    }
    const expected: ValidationProblemKind[] = [];
    const services = createServiceCollection();
    services.register(Concrete).as(IFace).asSelf();
    services.register(Dependent).asSelf().singleton();

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });

  it('detects a cycle running through an earlier face of a multi-face node', () => {
    abstract class IAlpha {}
    abstract class IBeta {}
    class Alpha implements IAlpha {
      @dependsOn(IBeta) private readonly beta!: IBeta;
    }
    class Beta implements IBeta {
      @dependsOn(IAlpha) private readonly alpha!: IAlpha;
    }
    const expected = [ValidationProblemKind.Cycle];
    const services = createServiceCollection();
    services.register(Alpha).as(IAlpha).asSelf(); // IAlpha is the earlier face
    services.register(Beta).as(IBeta);

    const actual = services.validate().problems.map((p) => p.kind);

    expect(actual).toEqual(expected);
  });

  it('resolves an earlier face at runtime', () => {
    abstract class IFace {}
    class Concrete implements IFace {}
    const services = createServiceCollection();
    services.register(Concrete).as(IFace).asSelf();
    const provider = services.buildProvider();

    const actual = provider.resolve(IFace);

    expect(actual).toBeInstanceOf(Concrete);
  });
});
