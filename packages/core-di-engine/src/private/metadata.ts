import type { MetadataType, ServiceIdentifier, SourceType } from '../types';
import type { ClassMetadata } from './types';

// A symbol const, not read inline: tsc does not declare `Symbol.metadata`, so an
// inline read fails type-check. No polyfill import here: the `??` fallback reaches
// the same registry symbol the polyfill installs, and importing the polyfill from a
// shared module hoists its side effect into a tree-shakeable chunk (the barrel and
// the polyfill entry own the install).
const MetadataKey: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata');

export const getMetadata = <T extends SourceType>(key: string, ctor: object): MetadataType<T> | undefined => {
  return (ctor as unknown as Record<symbol, ClassMetadata | undefined>)[MetadataKey]?.[key] as MetadataType<T> | undefined;
};

// Own-check `key` first: `ctx.metadata` inherits the parent's record prototypally, so a blind write mutates the parent's.
export const tagFieldMetadata = <T extends SourceType>(key: string, meta: ClassMetadata | undefined, name: string | symbol, identifier: ServiceIdentifier<T>): void => {
  if (meta === undefined) {
    throw new Error('Symbol.metadata is not installed');
  }
  const existing = meta[key] as MetadataType<T> | undefined;
  if (existing === undefined || !Object.hasOwn(meta, key)) {
    meta[key] = { ...existing };
  }
  (meta[key] as MetadataType<T>)[name] = identifier;
};
