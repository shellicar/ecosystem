# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
