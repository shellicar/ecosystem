// Moved to @shellicar/core-di-engine; shim keeps core-di's internal import paths stable.
export {
  asyncThroughSyncPath,
  buildPlanMissingFacts,
  captiveDependency,
  createScopeRequiresScoped,
  dependencyCycle,
  forwardIsTerminal,
  lifetimeAlreadySet,
  missingTarget,
  noDeclaredIdentity,
  overrideLifetimePreBuildOnly,
  syncBuildOfAsyncFactory,
  syncDisposeOfAsyncOnly,
  usingAsyncRequiresAsyncCollection,
} from '@shellicar/core-di-engine';
