import { describe, expect, it } from 'vitest';
import { createServiceCollection, InvalidServiceIdentifierError } from '../src';

abstract class IService {}
class Service implements IService {}

// The identity slots carry token identifiers: as() the faces, and forward()/to()
// the source and target of a redirect. A null or undefined identifier is invalid
// in any of them.
describe('as/forward null/undefined identifier checks', () => {
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

  it('throws when forward() is passed an undefined source token', () => {
    const services = createServiceCollection();

    const actual = () => services.forward(undefined as any).to(IService);

    expect(actual).toThrow(InvalidServiceIdentifierError);
  });

  it('throws when forward().to() is passed an undefined target', () => {
    const services = createServiceCollection();

    const actual = () => services.forward(IService).to(undefined as any);

    expect(actual).toThrow(InvalidServiceIdentifierError);
  });
});
