import type { Lifetime } from '../enums';

/**
 * Every guard and policy message in one place, one export per message. Individual
 * exports rather than a single Messages object: an object literal is retained whole
 * by a bundler the moment any message is touched, while separate consts shake so a
 * composition pays only for the guards it can actually hit.
 */
export const overrideLifetimePreBuildOnly = 'overrideLifetime is pre-build only: the provider derives its plans at buildProvider(), so a lifetime cannot be overridden afterwards. Override before building.';
export const usingAsyncRequiresAsyncCollection = 'usingAsync is available only on a collection created with { async: true }: a sync collection cannot await a factory at build.';
export const createScopeRequiresScoped = 'createScope requires a scoped lifetime to be composed. This composition omits it, so it has no scope to open.';
export const buildPlanMissingFacts = 'buildPlan reached a node with no graph facts; every emitted node is derived from the graph, so this cannot happen.';
export const syncDisposeOfAsyncOnly = 'Cannot synchronously dispose a boundary holding an async-only disposable; dispose it asynchronously (Symbol.asyncDispose / await using).';
export const forwardIsTerminal = 'A forward registration is terminal: it is a pure redirect with no lifetime of its own, so no verb can be chained after .to().';

export const noDeclaredIdentity = (implementationName: string): string => `${implementationName} was registered without a declared identity (no .as() or .asSelf())`;
export const lifetimeAlreadySet = (lifetime: Lifetime): string => `A lifetime (${lifetime}) is already set on this registration; a registration has exactly one lifetime.`;
export const syncBuildOfAsyncFactory = (tokenName: string): string => `Cannot build '${tokenName}' synchronously: it is registered with an async factory (usingAsync). Use buildProviderAsync to build a provider with async registrations.`;
export const dependencyCycle = (names: readonly string[]): string => `Dependency cycle: ${names.join(' -> ')} -> ${names[0]}`;
export const missingTarget = (fromName: string | undefined, missingName: string): string => `${fromName} depends on ${missingName}, which is not registered`;
export const captiveDependency = (ownerName: string | undefined, depName: string | undefined, lifetime: Lifetime): string => `${ownerName} (singleton) captures ${depName} (${lifetime}) in its dependency tree, a captive dependency`;
export const asyncThroughSyncPath = (ownerName: string | undefined, lifetime: Lifetime | undefined): string => `${ownerName} is an async factory resolving under ${lifetime ?? 'the default lifetime'}, an async factory reachable through a synchronous path; register it as a singleton and build with buildProviderAsync`;
