import { defineMetadata, getMetadata } from './private/metadata';
import type { ServiceIdentifier, SourceType } from './types';

const tagProperty = <T extends SourceType>(annotationTarget: object, name: string | symbol, identifier: ServiceIdentifier<T>) => {
  let existing = getMetadata<T>(annotationTarget);
  if (existing === undefined) {
    existing = {};
    defineMetadata(existing, annotationTarget);
  }
  existing[name] = identifier;
};

/**
 * Declares a dependency, use on a class field.
 * @param identifier the identifier to depend on, i.e. the interface
 */
export const dependsOn = <T extends SourceType>(identifier: ServiceIdentifier<T>) => {
  return (value: undefined, ctx: ClassFieldDecoratorContext) => {
    return function (this: object, initialValue: any) {
      const target = this.constructor;
      tagProperty(target, ctx.name, identifier);
      return initialValue;
    };
  };
};
