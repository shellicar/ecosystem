import type { Lifetime } from '../enums';
import type { DescriptorMap, ServiceIdentifier, ServiceRegistration, SourceType } from '../types';
import type { Boundary } from './boundaryEngine';
import type { BuildFn, Env, GraphNode } from './types';

/**
 * The resolution-strategy seam. The engine owns everything semantic: token to
 * node lookup, guards, surfaces, lifetime caching, and construction itself
 * (cycle tracking, error wrapping, disposal announcement), all reached through
 * the kit. A strategy owns only how construction is driven: the plan strategy
 * compiles a static plan and executes it; the naive strategy walks the
 * dependency tree recursively. Behaviour must be identical either way; the
 * engine spec runs against both to hold that line.
 */

export type Outcome = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: unknown };

export const ok = (value: unknown): Outcome => ({ ok: true, value });
export const failed = (error: unknown): Outcome => ({ ok: false, error });

export type OwnerIndex = ReadonlyMap<ServiceIdentifier<SourceType>, readonly GraphNode[]>;

/** The engine's per-view record: the registrations, their index, and whatever the strategy cached for this view. */
export type EngineView = {
  readonly services: DescriptorMap;
  readonly index: OwnerIndex;
  readonly data: unknown;
};

export type ResolvedField = { readonly field: string; readonly value: unknown };

export type StrategyKit = {
  readonly effectiveLifetime: (node: GraphNode) => Lifetime;
  readonly isCached: (lifetime: Lifetime) => boolean;
  readonly surfaceAt: (token: ServiceIdentifier<SourceType>) => 'root' | 'boundary' | undefined;
  readonly surfaceValue: (at: 'root' | 'boundary', boundary: Boundary) => unknown;
  /** The multiplicity guard: an error to raise for this token's bucket, or undefined. */
  readonly guardToken: (token: ServiceIdentifier<SourceType>, nodes: readonly GraphNode[]) => unknown | undefined;
  /** Token to concrete node: applies the guard, picks the last registration, follows forwards. Throws. */
  readonly nodeForToken: (view: EngineView, token: ServiceIdentifier<SourceType>) => GraphNode;
  /** The (last-declared) face a node is registered under, for error identity. */
  readonly ownerOf: (view: EngineView, node: GraphNode) => ServiceIdentifier<SourceType>;
  readonly heldErrorFor: (node: GraphNode) => unknown | undefined;
  readonly wrapForToken: (error: unknown, token: ServiceIdentifier<SourceType>, implementation: ServiceRegistration<SourceType>) => unknown;
  /** Route a build through the lifetime feature's cache (or straight through when uncached). */
  readonly cached: (lifetime: Lifetime, node: GraphNode, env: Env, build: BuildFn) => unknown;
  /**
   * Construct the instance: createFromDeps when args are supplied and the node
   * declares one, otherwise createInstance against the pass scope. Carries the
   * shared semantics both strategies must agree on: factory cycle tracking,
   * singleton depth for the runtime captive check, ServiceCreationError
   * wrapping, field assignment, disposal announcement.
   */
  readonly construct: (view: EngineView, node: GraphNode, token: ServiceIdentifier<SourceType>, lifetime: Lifetime, env: Env, boundary: Boundary, args: readonly SourceType[] | undefined, fields: readonly ResolvedField[]) => object;
};

export type ResolutionStrategy = {
  /** Build whatever per-view state the strategy needs (the plan strategy derives the graph here). */
  createView(services: DescriptorMap): unknown;
  instanceFor(view: EngineView, node: GraphNode, env: Env, boundary: Boundary): Outcome;
  /** Candidate nodes for prebake, in the order the strategy wants them constructed. The engine filters. */
  prebakeCandidates(view: EngineView): GraphNode[];
  /** Human-readable graph lines for printGraph. */
  graphLines(view: EngineView): string[];
};

export type StrategyFactory = (kit: StrategyKit) => ResolutionStrategy;
