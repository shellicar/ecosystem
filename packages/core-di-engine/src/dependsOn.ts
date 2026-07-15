import { DesignDependenciesKey } from './private/constants';
import { tagFieldMetadata } from './private/metadata';
import type { ServiceIdentifier, SourceType } from './types';

/**
 * Declares a dependency on a class field (the identifier, i.e. the interface).
 * Recorded at class-definition time, with zero construction.
 */
export const dependsOn = <T extends SourceType>(identifier: ServiceIdentifier<T>) => {
  return (_value: undefined, ctx: ClassFieldDecoratorContext): void => {
    tagFieldMetadata(DesignDependenciesKey, ctx.metadata, ctx.name, identifier);
  };
};
