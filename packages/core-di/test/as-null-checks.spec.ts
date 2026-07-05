import { describe, expect, it } from 'vitest';
import { createServiceCollection, InvalidServiceIdentifierError } from '../src';

abstract class IService {}
class Service implements IService {}

// The identity slot (as / forwardTo) now carries the face identifiers, so a
// null or undefined face is an invalid service identifier.
describe('as/forwardTo null/undefined identifier checks', () => {
  it('throws when as() is passed nothing', () => {
    const services = createServiceCollection();

    const actual = () => {
      // @ts-expect-error
      services.register(Service).as();
    };

    expect(actual).toThrow(InvalidServiceIdentifierError);
  });

  it('throws when as() is passed an undefined identifier', () => {
    const services = createServiceCollection();

    const actual = () => services.register(Service).as(undefined as any);

    expect(actual).toThrow(InvalidServiceIdentifierError);
  });

  it('throws when as() is passed a null identifier', () => {
    const services = createServiceCollection();

    const actual = () => services.register(Service).as(null as any);

    expect(actual).toThrow(InvalidServiceIdentifierError);
  });

  it('throws when forwardTo() is passed an undefined target', () => {
    const services = createServiceCollection();

    const actual = () => services.register(IService).forwardTo(undefined as any);

    expect(actual).toThrow(InvalidServiceIdentifierError);
  });
});
