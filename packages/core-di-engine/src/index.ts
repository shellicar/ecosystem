// The Symbol.metadata install, inline rather than `import './polyfill'`: an
// import shared between this entry and the polyfill entry gets hoisted by the
// bundler into a chunk that no sideEffects pattern can name, and dropped. Each
// entry carries its own copy of the one-line install; both files are listed in
// sideEffects, so both survive tree-shaking. Idempotent, so double-run is fine.
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');

// The engine seam: the structural machinery (identity/faces, using, forward,
// validate policies) and the lifetime/scope machinery (features, buildEngine),
// composed by presets: core-di is the full composition, core-di-lite the
// focused one. Not a stable public API; presets compose from it.
export { dependsOn } from './dependsOn';
export { CaptivePolicy, Lifetime, LogLevel, ResolveMultipleMode, RuntimeCaptivePolicy, ValidationProblemKind } from './enums';
export {
  BuilderError,
  CaptiveDependencyError,
  CircularDependencyError,
  InvalidImplementationError,
  InvalidOperationError,
  InvalidServiceIdentifierError,
  MultipleRegistrationError,
  ScopedSingletonRegistrationError,
  SelfDependencyError,
  ServiceCreationError,
  ServiceError,
  UnregisteredServiceError,
  ValidationError,
} from './errors';
export { IForwardBuilder, IForwardResult, IResolutionScope } from './interfaces';
export { type Boundary, type BuildEngineOptions, buildEngine, buildEngineAsync, type DisposalSink, type Engine, type EngineComposition, type EngineFor, type Scope, type ScopeOverlay } from './private/boundaryEngine';
export { createCollection, lifetimeVerbNames } from './private/composableBuilder';
export { DesignDependenciesKey } from './private/constants';
export { createDisposal } from './private/disposal';
export { ForwardBuilder } from './private/ForwardBuilder';
export { buildPlan, concreteNode, deriveFacts, detectCycles, findUnregisteredEdges, followForward, formatGraph, indexByOwner, type OwnerIndex, type Plan, type PlanStep, reachableFrom, topologicalOrder } from './private/graph';
export { createEnvKeyedCache } from './private/lifetimeContracts';
export { createResolveLifetime } from './private/lifetimeResolve';
export { createScopedLifetime } from './private/lifetimeScoped';
export { createSingletonLifetime } from './private/lifetimeSingleton';
export * from './private/messages';
export { getMetadata, tagFieldMetadata } from './private/metadata';
export { createNaiveStrategy } from './private/naiveStrategy';
export { createPlanStrategy } from './private/planStrategy';
export { asyncThroughSyncPathPolicy, captivePolicyFor, cyclePolicy, disposalCaptive, missingTargetPolicy, runGraphPolicies, strictCaptive } from './private/policies';
export { pushBucket } from './private/pushBucket';
export type { EngineView, Outcome, ResolutionStrategy, ResolvedField, StrategyFactory, StrategyKit } from './private/strategy';
export type {
  AbstractLifetimeVerbs,
  AddService,
  AsyncDisposable,
  AsyncNode,
  AsyncVerb,
  BuildFn,
  ClassMetadata,
  ComposableAbstractBuilder,
  ComposableCollection,
  ComposableNewableBuilder,
  ComposableNode,
  CreateCollectionOptions,
  Cycle,
  Disposal,
  EagerVerb,
  Env,
  Graph,
  GraphFacts,
  GraphNode,
  GraphPolicy,
  LifetimeFeature,
  LifetimeFeatures,
  NewableLifetimeVerbs,
  ScopedLifetime,
  SyncDisposable,
  UnregisteredEdge,
  VerbName,
} from './private/types';
export type {
  AbstractNewable,
  AsyncInstanceFactory,
  CacheKey,
  DescriptorMap,
  InstanceFactory,
  MetadataType,
  Newable,
  ResolvedDep,
  ResolvedDeps,
  ServiceDescriptor,
  ServiceIdentifier,
  ServiceImplementation,
  ServiceRegistration,
  SourceType,
  ValidationProblem,
  ValidationReport,
} from './types';
export { createDescriptorMap } from './types';
