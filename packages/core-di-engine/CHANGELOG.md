# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0-alpha.6] - 2026-07-30

### Added

- `missingTargetPolicyFor(knownTargets)` builds a missing-target policy that treats the given tokens as always satisfied, for a composing package whose engine binds some tokens itself instead of through registration.
- `ScopeMismatchError` is thrown when a token only a scope can serve is resolved from somewhere that has no scope.
- `ValidationProblemKind.ScopeMismatch` and `scopeMismatchPolicyFor` report a token only a scope can serve being depended on by a consumer with no scope to be served from. The token is bound by the engine rather than registered, so it is not a missing target.
- `ValidationProblemKind.SharingMismatch` and `sharingMismatchPolicy` report a singleton holding something shared more narrowly than itself: a scoped or resolve dependency it cannot take part in sharing. Reported as a warning whatever `CaptivePolicy` says, since the two ask different questions.

### Changed

- `ValidationError` carries `errors` and `warnings`, the same two lists the report has, in place of a single `problems`.
- `ValidationReport` separates `errors` from `warnings`, and every `ValidationProblem` carries a `Severity`. A report is valid when it has no errors; a warning never makes one invalid.
- A captive dependency is reported as an error under `CaptivePolicy.Strict` and as a warning under `CaptivePolicy.Disposal`, so the severity comes from the policy that asked for the check.
- A lifetime reads as a word in every message that names one, instead of the enum's wire value.
- A surface token declares how far it reaches: `root` is always the root surface, `nearest` is the boundary being resolved from with the root counting as one, and `scope` is the boundary being resolved from with the root excluded. Resolving a `scope` token where there is no scope throws `ScopeMismatchError`.

### Fixed

- `resolveAll` answers a surface token with an empty list when the composition bound no surface, instead of a list holding `undefined`.
- `resolveAll` answers a surface token with the one surface its reach allows, instead of an empty list. Where the reach allows none, such as a scope-only token at the root, it still answers empty, which is what `resolveAll` says about anything it has nothing for.
- A scope mismatch is reported on everything a singleton can reach, not only on the singleton's own edges: a singleton resolves at the root and so does everything under it, so a scoped node reached that way can never be given a scope either.
- A singleton reached from more than one place is compiled once. It was compiled once per place it was reached from, which built and discarded its resolve-lifetime dependencies again each time.
- A singleton resolves at the root, whichever boundary asked for it: its boundary, its resolution pass and its registrations are the root's, so nothing a scope owns can reach an instance the whole provider shares.
- Every singleton is constructed in a resolution pass of its own. A resolve-lifetime dependency inside a singleton is shared with that construction and nothing else, so two singletons never share one and the object graph is the same whether they were built by the same resolve or prebaked separately.

## [5.0.0-alpha.5] - 2026-07-27

### Added

- `buildEngine`/`buildEngineAsync` accept a `bindRoot` callback, invoked once the engine is assembled but before any `.eager()` singleton is prebaked, so a composing package can bind its own root surface before construction can observe it.

### Fixed

- `IForwardResult` is exported as a real value again.

## [5.0.0-alpha.4] - 2026-07-27

### Added

- `.shadow()` on a scoped collection's builder marks a registration as allowed to win over an ancestor scope's registration of the same token, instead of colliding with it as a genuine duplicate at resolve. Present only where the collection composes a scoped lifetime.

### Changed

- Cycle-policy wording: a registration overridden by a later duplicate under `ResolveMultipleMode.LastRegistered` is now called "overridden", not "shadowed" — "shadowed" now names `.shadow()` exclusively.

## [5.0.0-alpha.2] - 2026-07-25

### Changed

- `EngineComposition.defaultLifetime` is removed: the engine holds no default lifetime. The composing package stamps a concrete lifetime on every registration before building, and the engine refuses an un-stamped node. This also closes a captive-detection gap where a root that relied on the default was judged by its raw (undefined) lifetime and escaped the walk.
- `EngineComposition.runtimeCaptivePolicy` is now required: every composition must answer whether a runtime captive throws at resolve, rather than the engine silently enforcing nothing when omitted.
- Lifetime verbs are pre-commit only: once the composition stamps its default at build, a later verb throws with an error naming the commit.

## [5.0.0-alpha.1] - 2026-07-19

The shared engine that core-di and core-di-lite compose from: the static-DAG build/resolve model, composable lifetimes, graph-policy validation, and boundary-scoped disposal, extracted so both packages share a single engine copy.

### Added

- `.eager()` constructs a singleton at build instead of on first resolve.
- `CaptivePolicy` (build-time, checked by `validate()`) and `RuntimeCaptivePolicy` (resolve-time, checked by `resolve()`) configure how a singleton reaching a shorter-lived dependency is reported or enforced.
- `printGraph(write)` writes a human-readable dependency graph: registered tokens, their dependency edges, and effective lifetimes.
- `runGraphPolicies` and the named policy functions (`missingTargetPolicy`, `cyclePolicy`, `captivePolicyFor`, `asyncThroughSyncPathPolicy`) are the composable primitives a consumer wires into its own `validate()`, producing a `ValidationReport` of `ValidationProblem` entries with no construction.
- Async factories (`usingAsync`) build at `buildEngineAsync`, the async build boundary, which awaits async singletons in dependency order; `resolve()` stays synchronous.
- Disposal is a composed feature: each disposable is tracked to the boundary that resolved it and torn down there, not only at the root.
- Error types: `ServiceError`, `BuilderError`, `UnregisteredServiceError`, `MultipleRegistrationError`, `ServiceCreationError`, `SelfDependencyError`, `CircularDependencyError`, `ScopedSingletonRegistrationError`, `InvalidServiceIdentifierError`, `InvalidImplementationError`, `ValidationError`, `InvalidOperationError`, `CaptiveDependencyError`.
- Initial release: the static-DAG engine that core-di and core-di-lite compose from, extracted so both packages share one resolution engine.
- Lifetimes are composable features (singleton, scoped, resolve); a composition simply lacks the verb for a feature it doesn't include. Transient is the floor: no feature caches it, so it is the uncached default.

[5.0.0-alpha.6]: https://github.com/shellicar/ecosystem/releases/tag/core-di-engine@5.0.0-alpha.6
[5.0.0-alpha.5]: https://github.com/shellicar/ecosystem/releases/tag/core-di-engine@5.0.0-alpha.5
[5.0.0-alpha.4]: https://github.com/shellicar/ecosystem/releases/tag/core-di-engine@5.0.0-alpha.4
[5.0.0-alpha.2]: https://github.com/shellicar/ecosystem/releases/tag/core-di-engine@5.0.0-alpha.2
[5.0.0-alpha.1]: https://github.com/shellicar/ecosystem/releases/tag/core-di-engine@5.0.0-alpha.1
