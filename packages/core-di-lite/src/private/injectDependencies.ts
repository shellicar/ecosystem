import type { ServiceIdentifier, SourceType } from '../types';
import { getMetadata } from './metadata';

export function injectDependencies<T extends SourceType>(instance: T, resolveInternal: <U extends SourceType>(id: ServiceIdentifier<U>) => U): void {
  const deps = getMetadata(instance.constructor) ?? {};
  for (const key of Reflect.ownKeys(deps)) {
    const depIdentifier = deps[key];
    const dep = resolveInternal(depIdentifier);
    (instance as Record<string | symbol, unknown>)[key] = dep;
  }
}
