// Moved to @shellicar/core-di-engine; shim keeps core-di's internal import paths
// stable. ScopeServicesSource stays here: it references IServiceCollection, which
// is core-di's surface, not the engine's.
import type { IServiceCollection } from '../interfaces';
import type { DescriptorMap } from '../types';

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
} from '@shellicar/core-di-engine';

export type ScopeServicesSource = IServiceCollection & {
  cloneShared(): ScopeServicesSource;
  snapshot(): { readonly services: DescriptorMap; readonly version: number; };
};
