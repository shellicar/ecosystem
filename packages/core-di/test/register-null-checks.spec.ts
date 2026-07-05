import { describe, expect, it } from 'vitest';
import { createServiceCollection, InvalidImplementationError } from '../src';

// register() now takes the implementation in its first slot, so a null or
// undefined subject is an invalid implementation.
describe('register method null/undefined implementation checks', () => {
  it('throws when passed nothing', () => {
    const services = createServiceCollection();

    const actual = () => {
      // @ts-expect-error
      services.register();
    };

    expect(actual).toThrow(InvalidImplementationError);
  });

  it('throws when passed an undefined implementation', () => {
    const services = createServiceCollection();

    const actual = () => services.register(undefined as any);

    expect(actual).toThrow(InvalidImplementationError);
  });

  it('throws when passed a null implementation', () => {
    const services = createServiceCollection();

    const actual = () => services.register(null as any);

    expect(actual).toThrow(InvalidImplementationError);
  });
});
