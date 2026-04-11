import { throws } from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createServiceCollection, InvalidServiceIdentifierError } from '../src';

abstract class IService {}

describe('Register method null/undefined identifier checks', () => {
  it('throws when passed nothing', () => {
    const services = createServiceCollection();
    throws(() => {
      // @ts-expect-error
      services.register();
    }, InvalidServiceIdentifierError);
  });

  it('throws when passed undefined identifier', () => {
    const services = createServiceCollection();
    throws(() => {
      services.register(undefined as any);
    }, InvalidServiceIdentifierError);
  });

  it('throws when passed a valid identifier and an undefined identifier', () => {
    const services = createServiceCollection();
    throws(() => {
      services.register(IService, undefined as any);
    }, InvalidServiceIdentifierError);
  });
});
