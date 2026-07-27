# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- `.shadow()` on a scoped collection's builder marks a registration as allowed to win over an ancestor scope's registration of the same token, instead of colliding with it as a genuine duplicate at resolve. Present only where the collection composes a scoped lifetime.

### Changed

- `EngineComposition.defaultLifetime` is removed: the engine holds no default lifetime. The composing package stamps a concrete lifetime on every registration before building, and the engine refuses an un-stamped node. This also closes a captive-detection gap where a root that relied on the default was judged by its raw (undefined) lifetime and escaped the walk.
- `EngineComposition.runtimeCaptivePolicy` is now required: every composition must answer whether a runtime captive throws at resolve, rather than the engine silently enforcing nothing when omitted.
- Lifetime verbs are pre-commit only: once the composition stamps its default at build, a later verb throws with an error naming the commit.
- Cycle-policy wording: a registration overridden by a later duplicate under `ResolveMultipleMode.LastRegistered` is now called "overridden", not "shadowed" — "shadowed" now names `.shadow()` exclusively.

### Fixed

- `IForwardResult` is now a real runtime export again; importing the built package no longer throws because a consumer statically re-exported a name the barrel had accidentally marked type-only.

## [5.0.0] - 2026-07-16

The shared engine that core-di and core-di-lite compose from: the static-DAG build/resolve model, composable lifetimes, graph-policy validation, and boundary-scoped disposal, extracted so both packages share a single engine copy.

### Added

- Initial release: the static-DAG engine that core-di and core-di-lite compose from, extracted so both packages share one resolution engine.
- Lifetimes are composable features (singleton, scoped, resolve); a composition simply lacks the verb for a feature it doesn't include. Transient is the floor: no feature caches it, so it is the uncached default.
- `runGraphPolicies` and the named policy functions (`missingTargetPolicy`, `cyclePolicy`, `captivePolicyFor`, `asyncThroughSyncPathPolicy`) are the composable primitives a consumer wires into its own `validate()`, producing a `ValidationReport` of `ValidationProblem` entries with no construction.
- Disposal is a composed feature: each disposable is tracked to the boundary that resolved it and torn down there, not only at the root.
- Async factories (`usingAsync`) build at `buildEngineAsync`, the async build boundary, which awaits async singletons in dependency order; `resolve()` stays synchronous.
- `.eager()` constructs a singleton at build instead of on first resolve.
- `printGraph(write)` writes a human-readable dependency graph: registered tokens, their dependency edges, and effective lifetimes.
- `CaptivePolicy` (build-time, checked by `validate()`) and `RuntimeCaptivePolicy` (resolve-time, checked by `resolve()`) configure how a singleton reaching a shorter-lived dependency is reported or enforced.
- Error types: `ServiceError`, `BuilderError`, `UnregisteredServiceError`, `MultipleRegistrationError`, `ServiceCreationError`, `SelfDependencyError`, `CircularDependencyError`, `ScopedSingletonRegistrationError`, `InvalidServiceIdentifierError`, `InvalidImplementationError`, `ValidationError`, `InvalidOperationError`, `CaptiveDependencyError`.

[5.0.0]: https://github.com/shellicar/ecosystem/releases/tag/core-di-engine@5.0.0
