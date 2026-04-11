import { throws } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection, InvalidImplementationError } from '../src';

abstract class IService {}

describe('To method null/undefined implementation checks', () => {
  it('throws when passed nothing', () => {
    const services = createServiceCollection();
    throws(() => {
      // @ts-expect-error
      services.register(IService).to();
    }, InvalidImplementationError);
  });

  it('throws when passed undefined implementation', () => {
    const services = createServiceCollection();
    throws(() => {
      services.register(IService).to(undefined as any);
    }, InvalidImplementationError);
  });

  it('throws when passed null implementation', () => {
    const services = createServiceCollection();
    throws(() => {
      services.register(IService).to(null as any);
    }, InvalidImplementationError);
  });
});
