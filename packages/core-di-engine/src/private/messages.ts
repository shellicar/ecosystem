import type { Lifetime } from '../enums';

// A lifetime reads as a word inside a sentence, not as the enum's wire value: every
// message below renders one through here, so prose never mixes `singleton` with
// `SINGLETON`. The bracketed tag in printGraph's graph dump is not prose and keeps
// the wire value.
const asWord = (lifetime: Lifetime): string => lifetime.toLowerCase();

/**
 * Every guard and policy message in one place, one export per message. Individual
 * exports rather than a single Messages object: an object literal is retained whole
 * by a bundler the moment any message is touched, while separate consts shake so a
 * composition pays only for the guards it can actually hit.
 */
export const overrideLifetimePreBuildOnly = 'overrideLifetime is pre-build only: the provider derives its plans at buildProvider(), so a lifetime cannot be overridden afterwards. Override before building.';
export const createScopeRequiresScoped = 'createScope requires a scoped lifetime to be composed. This composition omits it, so it has no scope to open.';
export const buildPlanMissingFacts = 'buildPlan reached a node with no graph facts; every emitted node is derived from the graph, so this cannot happen.';
export const syncDisposeOfAsyncOnly = 'Cannot synchronously dispose a boundary holding an async-only disposable; dispose it asynchronously (Symbol.asyncDispose / await using).';
export const forwardIsTerminal = 'A forward registration is terminal: it is a pure redirect with no lifetime of its own, so no verb can be chained after .to().';

export const nodeWithoutLifetime = (implementationName: string): string => `${implementationName} reached the engine without a lifetime; the composition must stamp a concrete lifetime on every registration before building.`;
export const noDeclaredIdentity = (implementationName: string): string => `${implementationName} was registered without a declared identity (no .as() or .asSelf())`;
export const lifetimeAlreadySet = (lifetime: Lifetime): string => `A lifetime (${asWord(lifetime)}) is already set on this registration; a registration has exactly one lifetime.`;
export const shadowAlreadySet = 'shadow() is already set on this registration; a registration can shadow an ancestor at most once.';
export const lifetimeAfterCommit = (lifetime: Lifetime): string => `This registration was already committed with the default lifetime (${asWord(lifetime)}) when its provider or scope was built. Call lifetime verbs before building or resolving.`;
export const syncBuildOfAsyncFactory = (tokenName: string): string => `Cannot build '${tokenName}' synchronously: it is registered with an async factory (usingAsync). Use buildProviderAsync to build a provider with async registrations.`;
export const asyncFactoryOnSyncPath = (tokenName: string): string => `Cannot construct '${tokenName}' synchronously: its factory is async (usingAsync), and only a singleton settles at the async build boundary. Register it as a singleton and build with buildProviderAsync.`;
export const dependencyCycle = (names: readonly string[]): string => `Dependency cycle: ${names.join(' -> ')} -> ${names[0]}`;
export const dependencyCycleOverridden = (names: readonly string[]): string => `${dependencyCycle(names)} (through a registration overridden for resolve(); reachable via resolveAll(), which walks every registration)`;
export const missingTarget = (fromName: string | undefined, missingName: string): string => `${fromName} depends on ${missingName}, which is not registered`;
export const scopeMismatchSingleton = (ownerName: string | undefined, tokenName: string): string => `${ownerName} (singleton) depends on ${tokenName}, which only a scope can serve: one instance serves the whole provider, so it outlives every scope and no boundary can give it one`;
export const scopeMismatchRootReachable = (ownerName: string | undefined, tokenName: string, lifetime: Lifetime): string => `${ownerName} (${asWord(lifetime)}) depends on ${tokenName}, which only a scope can serve: resolved from the root it receives the root provider, which is not a scope`;
export const sharingMismatch = (ownerName: string | undefined, depName: string | undefined, lifetime: Lifetime): string =>
  `${ownerName} (singleton) depends on ${depName} (${asWord(lifetime)}), which is shared more narrowly than a singleton: one instance serves the whole provider, so it cannot take part in that sharing and would hold whichever instance happened to build it`;
export const captiveDependency = (ownerName: string | undefined, depName: string | undefined, lifetime: Lifetime): string => `${ownerName} (singleton) captures ${depName} (${asWord(lifetime)}) in its dependency tree, a captive dependency`;
export const asyncThroughSyncPath = (ownerName: string | undefined, lifetime: Lifetime | undefined): string =>
  `${ownerName} is an async factory resolving under ${lifetime === undefined ? 'the default lifetime' : asWord(lifetime)}, an async factory reachable through a synchronous path; register it as a singleton and build with buildProviderAsync`;
