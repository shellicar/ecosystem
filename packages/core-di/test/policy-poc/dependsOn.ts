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
// importing the decorator installs it.
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');

const DepsKey = Symbol.for('design:dependencies');

type DepsRecord = Record<string | symbol, ServiceIdentifier<SourceType>>;

export const dependsOn = <T extends SourceType>(identifier: ServiceIdentifier<T>) => {
  return (_value: undefined, ctx: ClassFieldDecoratorContext): void => {
    const existing = ctx.metadata[DepsKey] as DepsRecord | undefined;
    if (existing === undefined || !Object.hasOwn(ctx.metadata, DepsKey)) {
      ctx.metadata[DepsKey] = { ...existing };
    }
    (ctx.metadata[DepsKey] as DepsRecord)[ctx.name] = identifier;
  };
};

export const getDeclaredEdges = (impl: Impl): [string, Token][] => {
  const record = (impl as { [Symbol.metadata]?: Record<symbol, unknown> })[Symbol.metadata]?.[DepsKey] as DepsRecord | undefined;
  return Object.entries(record ?? {}) as unknown as [string, Token][];
};
