import '../polyfill';
import type { MetadataType, ServiceIdentifier, SourceType } from '../types';

// The polyfill import above installs `Symbol.metadata`, so this module only
// reads it — it does not install it again. Capturing it as a symbol const
// (rather than reading `Symbol.metadata` inline at each use) is required for
// tsc: without it, code referencing `Symbol.metadata` passes vitest (the
// runtime value is there) but fails tsc (the property is not declared on
// `SymbolConstructor` here).
const MetadataKey: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata');

type ClassMetadata = Record<string | symbol, unknown>;

/** Read a class's own metadata record for `key`, off the class constructor — zero construction. */
export const getMetadata = <T extends SourceType>(key: string, ctor: object): MetadataType<T> | undefined => {
  return (ctor as unknown as Record<symbol, ClassMetadata | undefined>)[MetadataKey]?.[key] as MetadataType<T> | undefined;
};

/**
 * Record one class field's dependency into a class field decorator's
 * `ctx.metadata`, at class-definition time. `ctx.metadata` inherits
 * prototypally from the parent class's metadata, so a subclass's first write
 * must own-check `key` before mutating — otherwise it would mutate the
 * parent's shared record instead of layering its own edges over it.
 */
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

