/**
 * Layer 1 — definition-time dependency edges. Depends on: types.
 *
 * The ctx.metadata decorator proven in depends-on-definition-time-experiment:
 * edges are readable from the class itself, no construction anywhere.
 */
import type { ServiceIdentifier, SourceType } from '../../src/types';
import type { Impl, Token } from './types';

// V8 does not ship Symbol.metadata yet; must exist before any decorated class
// is evaluated. In the real library this lives in the dependsOn module, so
// importing the decorator installs it. Captured as a const because the lib
// types do not declare Symbol.metadata.
const MetadataKey: symbol = ((Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata'));

const DepsKey = Symbol.for('design:dependencies');

type DepsRecord = Record<string | symbol, ServiceIdentifier<SourceType>>;

export const dependsOn = <T extends SourceType>(identifier: ServiceIdentifier<T>) => {
  return (_value: undefined, ctx: ClassFieldDecoratorContext): void => {
    // ctx.metadata is typed optional because it is undefined when
    // Symbol.metadata is missing at class-evaluation time; the polyfill
    // above guarantees it here.
    const meta = ctx.metadata;
    if (meta === undefined) {
      throw new Error('Symbol.metadata is not installed');
    }
    const existing = meta[DepsKey] as DepsRecord | undefined;
    // ctx.metadata inherits prototypically from the parent class's metadata.
    // Own-check so a subclass gets its own record layered over the parent's
    // rather than mutating the parent's edges.
    if (existing === undefined || !Object.hasOwn(meta, DepsKey)) {
      meta[DepsKey] = { ...existing };
    }
    (meta[DepsKey] as DepsRecord)[ctx.name] = identifier;
  };
};

export const getDeclaredEdges = (impl: Impl): [string, Token][] => {
  const record = (impl as unknown as Record<symbol, Record<symbol, unknown> | undefined>)[MetadataKey]?.[DepsKey] as DepsRecord | undefined;
  return Object.entries(record ?? {}) as unknown as [string, Token][];
};
