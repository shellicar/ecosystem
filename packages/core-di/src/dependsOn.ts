import type { IResolutionScope, IScopedProvider, IServiceProvider } from './interfaces';
import { DesignDependenciesKey } from './private/constants';
import { tagFieldMetadata } from './private/metadata';
import type { ServiceIdentifier, SourceType } from './types';

/**
 * declares a dependency, use on a class field.
 * Can also depend on {@link IServiceProvider}, {@link IResolutionScope}, or {@link IScopedProvider}.
 * @param identifier the identifier to depend on, i.e. the interface
 *
 * Recorded at class DEFINITION time via `ctx.metadata` (stage-3 decorator
 * metadata) — the edge is readable off the class the moment the class
 * statement is evaluated, with zero construction.
 */
export const dependsOn = <T extends SourceType>(identifier: ServiceIdentifier<T>) => {
  return (_value: undefined, ctx: ClassFieldDecoratorContext): void => {
    tagFieldMetadata(DesignDependenciesKey, ctx.metadata, ctx.name, identifier);
  };
};
