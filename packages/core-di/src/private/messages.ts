import type { Lifetime } from '../enums';

/**
 * Every guard and policy message in one place. The error classes in errors.ts carry
 * their own templates; this module holds the prose that previously lived inline at
 * throw sites, so wording is edited in one file and the bundle cost of the messages
 * is visible in one place.
 */
export const Messages = {
  overrideLifetimePreBuildOnly: 'overrideLifetime is pre-build only: the provider derives its plans at buildProvider(), so a lifetime cannot be overridden afterwards. Override before building.',
  usingAsyncRequiresAsyncCollection: 'usingAsync is available only on a collection created with { async: true }: a sync collection cannot await a factory at build.',
  createScopeRequiresScoped: 'createScope requires a scoped lifetime to be composed. This composition omits it, so it has no scope to open.',
  buildPlanMissingFacts: 'buildPlan reached a node with no graph facts; every emitted node is derived from the graph, so this cannot happen.',
  syncDisposeOfAsyncOnly: 'Cannot synchronously dispose a boundary holding an async-only disposable; dispose it asynchronously (Symbol.asyncDispose / await using).',
  forwardIsTerminal: 'A forward registration is terminal: it is a pure redirect with no lifetime of its own, so no verb can be chained after .to().',

  noDeclaredIdentity: (implementationName: string): string => `${implementationName} was registered without a declared identity (no .as() or .asSelf())`,
  lifetimeAlreadySet: (lifetime: Lifetime): string => `A lifetime (${lifetime}) is already set on this registration; a registration has exactly one lifetime.`,
  syncBuildOfAsyncFactory: (tokenName: string): string => `Cannot build '${tokenName}' synchronously: it is registered with an async factory (usingAsync). Use buildProviderAsync to build a provider with async registrations.`,
  dependencyCycle: (names: readonly string[]): string => `Dependency cycle: ${names.join(' -> ')} -> ${names[0]}`,
  missingTarget: (fromName: string | undefined, missingName: string): string => `${fromName} depends on ${missingName}, which is not registered`,
  captiveDependency: (ownerName: string | undefined, depName: string | undefined, lifetime: Lifetime): string => `${ownerName} (singleton) captures ${depName} (${lifetime}) in its dependency tree, a captive dependency`,
  asyncThroughSyncPath: (ownerName: string | undefined, lifetime: Lifetime | undefined): string => `${ownerName} is an async factory resolving under ${lifetime ?? 'the default lifetime'}, an async factory reachable through a synchronous path; register it as a singleton and build with buildProviderAsync`,
} as const;
