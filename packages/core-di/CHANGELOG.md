# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- `createServiceCollection({ defaultLifetime })` sets the lifetime a registration gets when no lifetime verb is called on it. Defaults to `Lifetime.Resolve` (unchanged behaviour when omitted); an explicit verb always wins.
- `IScopedProvider.createScope()` opens a nested scope: it starts with the parent scope's registrations at that moment, holds its own scoped instances, and shares singletons with the whole provider.
- `createServiceCollection({ eagerSingletons })` constructs every singleton at `buildProvider`, not just the `.eager()` and async ones, and a constructor that throws now throws there too instead of at the first resolve. Defaults to `false` (unchanged behaviour when omitted).
- A scope can `.shadow()` a registration on `register()`/`forward()` to override an ancestor scope's registration of the same token, instead of throwing `MultipleRegistrationError`. Only available on `IScopedProvider.Services`; a root collection's `register()`/`forward()` never carry `.shadow()`.
- A dependency on `IScopedProvider` is reported as a scope mismatch: an error for a singleton, which serves the whole provider and so can never be given a scope, and a warning for any other lifetime, which is served correctly inside a scope and only wrong from the root.
- `validate()` warns when a singleton holds a scoped or resolve dependency, which is shared more narrowly than the singleton itself: it takes a private instance where a shared one was asked for. A scoped dependency reports this alongside the captive dependency, which is the separate disposal hazard.

### Changed

- `runtimeCaptivePolicy` now defaults to `RuntimeCaptivePolicy.Throw`: a singleton pulling a scoped instance through an opaque factory throws `CaptiveDependencyError` at `resolve()`. Pass `RuntimeCaptivePolicy.None` to allow the capture as before.
- A registration's lifetime is fixed once the collection is committed (provider built, or resolved in a scope): a lifetime verb after that point throws, naming the commit.
- Resolving the `IScopedProvider` token now throws `UnregisteredServiceError` at the root: the root is not a scope, so it no longer answers for the token, the same way an unregistered service does. Inside a scope, resolving it still returns the scope itself, unchanged.
- `validate()` returns `errors` and `warnings` separately, each problem carrying its severity. Only errors make a report invalid, so `buildProvider({ validate: true })` refuses on an error and builds through a warning.
- Resolving `IScopedProvider` from the root throws `ScopeMismatchError` instead of `UnregisteredServiceError`: the engine binds the token, so nothing is missing, the root simply has no scope to serve.
- The root provider's `resolve` no longer accepts `IScopedProvider`: asking the root for a scope does not typecheck.
- A `ValidationError` from `buildProvider({ validate: true })` carries `errors` and `warnings` rather than a single `problems`, so the warnings from the same run are on it too.

### Fixed

- Fixed an `.eager()` singleton (or any singleton under `eagerSingletons`) resolving `IServiceProvider` or `IResolutionScope` during construction: it received `undefined` instead of the provider, because the root surface was bound only after eager construction ran.
- Fixed `validate()` reporting `IServiceProvider`, `IScopedProvider`, and `IResolutionScope` as missing targets: these are bound by the engine at build, never registered, and `resolve()` already handled them correctly.
- Injecting `IScopedProvider` into a service resolved from the root throws `ScopeMismatchError`, instead of silently handing it the root provider wearing the scoped type.
- A singleton no longer captures what the scope that first resolved it owned. Its dependencies are the root's instances, resolved against the root's registrations, so a scope's `.shadow()` cannot reach an instance the whole provider shares.
- A resolve-lifetime dependency of a singleton is no longer shared with whatever else happened to be built alongside it. Each singleton is constructed in its own pass, so what it holds is the same whichever call built it and whether or not `eagerSingletons` is set.
- `validate()` reports a scope mismatch for a service a singleton can reach, not only for the singleton itself: a scoped service reached from a singleton resolves at the root with it, where `IScopedProvider` can never be served.
- `resolveAll(IServiceProvider)` and `resolveAll(IResolutionScope)` return the resolving surface rather than an empty list, and `resolveAll(IScopedProvider)` returns the scope inside a scope and nothing at the root.

## [5.0.0] - 2026-07-16

Rebuilt on `@shellicar/core-di-engine`, the shared engine that core-di-lite also composes from. The version jumps to match core-di-lite and core-di-engine: the three packages now release in lockstep so a single engine copy resolves across them. The registration grammar is now the same shape as lite's: `register(Implementation).as(Identifier)` / `.asSelf()` / `.using(factory)`, not `register(Interface).to(Implementation)`.

### Added

- Record dependency edges at class-definition time with the `dependsOn` decorator, so the container derives a static dependency graph before constructing anything
- Build asynchronously: `createServiceCollection({ async: true })` exposes `usingAsync` factories and `buildProviderAsync`, which awaits async singletons in dependency order while `resolve` stays synchronous
- Construct eagerly with the `.eager()` registration verb; singletons are lazy by default
- Dispose per lifetime: each disposable is tracked to the boundary that resolved it, and `IAsyncDisposable` / `Symbol.asyncDispose` are supported on providers and scopes
- Configure the captive-dependency check with `CaptivePolicy` (build-time) and `RuntimeCaptivePolicy` (resolve-time)
- `validate()` reports problems as a `ValidationReport` of `ValidationProblem` entries classified by `ValidationProblemKind`
- New error types: `BuilderError`, `ValidationError`, `CaptiveDependencyError`, and `InvalidOperationError`
- Inspect the built graph with `provider.printGraph(write = console.log)` — a human-readable visualisation of the registered tokens, their `@dependsOn` and forward edges, and their lifetimes
- Time `buildProvider` and each `resolve` with `buildProvider({ instrument: { enabled, onTiming } })` — off by default, so a provider without it pays nothing

### Changed

- Rebuild the container as a static-DAG composable engine
- `INewableServiceBuilder` and `IAbstractServiceBuilder` replace `IServiceBuilder` and `ILifetimeBuilder`, and the builder interfaces are now type-only exports

## [4.0.2] - 2026-05-17

### Changed

- Updated patch dependencies

## [4.0.1] - 2026-05-08

### Changed

- Updated patch dependencies

### Security

- Fixed GHSA-qx2v-qp2m-jg93 in postcss ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93))

## [4.0.0] - 2026-04-15

### Changed

- Updated development dependencies

### Fixed

- Fix factory registrations with the same implementation class sharing a singleton incorrectly

## [3.1.7] - 2026-04-14

### Changed

- Replace @abraham/reflection with a global WeakMap for metadata storage

### Removed

- Remove @abraham/reflection dependency

## [3.1.6] - 2026-02-28

### Changed

- Updated all dependencies to latest versions.

### Security

- Fixed GHSA-mw96-cpmx-2vgc: rollup arbitrary file write via path traversal. ([GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc))

## [3.1.5] - 2026-02-23

### Added

- Added `IDisposable` implementation to `IServiceProvider` interface.

### Fixed

- Fixed singleton disposal: root provider now disposes singleton `IDisposable` instances when disposed, matching MS DI behaviour.

## [3.1.4] - 2026-02-22

### Added

- New `CircularDependencyError` exported error class.

### Fixed

- Fixed circular dependency detection: all circular dependencies now throw `CircularDependencyError` instead of silently stack overflowing.
- Fixed self-dependency check that was unreachable due to comparing abstract class against concrete class.

## [3.1.3] - 2026-02-09

### Changed

- Moved pnpm overrides from package.json to pnpm-workspace.yaml.
- Updated @shellicar/build-clean to 1.2.2, biome to 2.3.14.
- Updated all dependencies to latest versions.

### Security

- Fixed CVE-2026-25547 in @isaacs/brace-expansion. ([GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2))

## [3.1.2] - 2025-12-26

### Changed

- Updated all dependencies to latest versions.

## [3.1.1] - 2025-10-24

### Changed

- Updated all dependencies to latest versions.

## [3.1.0] - 2025-08-24

### Changed

- Updated all dependencies to latest versions.

## [3.0.0] - 2025-08-03

### Added

- Enhanced error handling with better error message formatting showing both service identifier and implementation.
- Support for error chaining in dependency resolution failures.

### Changed

- Updated all dependencies to latest versions.

## [2.4.0] - 2025-05-18

### Added

- Added null/undefined checks for service registration and implementation.
- Added `InvalidServiceIdentifierError` for null/undefined service identifiers.
- Added `InvalidImplementationError` for null/undefined implementations.

## [2.3.0] - 2025-01-21

### Fixed

- Fix typed factory registration needing to be non-abstract.

## [2.2.0] - 2025-01-10

### Fixed

- Fix export paths.

## [2.1.1] - 2025-01-10

### Changed

- Change back to `tsup`.

## [2.1.0] - 2025-01-08

### Added

- Add `readme` example project.

### Changed

- Use `packages` and `examples` monorepo structure.
- Use `tsup-node` for packaging.
- Declare `@abraham/reflection` as dev dependency.

## [2.0.1] - 2025-01-07

### Security

- Update `cross-spawn` (CVE-2024-21538).

## [2.0.0] - 2025-01-05

### Added

- Extend `IServiceCollection.register` to accept multiple interfaces (ServiceIdentifiers). All interfaces will resolve to the same implementation (and hence, instance, respectful of lifetime).
- Add `IServiceCollection.overrideLifetime` to allow overriding the lifetime of all service descriptors matching the service identifier (mainly for testing scenarios).

### Changed

- Some exported types changed names/functionality: `LifetimeBuilder` to `ILifetimeBuilder`, `ServiceBuilder` to `IServiceBuilder`, `IServiceScope` to `IResolutionScope` and `IScopedProvider`. No longer export `ServiceCollection` and `ServiceProvider`. Factory methods now take `IResolutionScope` instead of `IServiceScope & IServiceProvider`.
- Switch to vitest from mocha.

## [1.0.0] - 2024-09-29

### Fixed

- Prevent registration of singletons in scoped provider.

## [0.1.0] - 2024-09-22

### Added

- Ability to customise logging.
- More tests and examples.

### Changed

- Use `tsup` for build.

### Removed

- `enable` and `disable` log functions.

## [0.0.4] - 2024-09-18

### Added

- Ability to configure ServiceCollection/Provider.
- Ability to override registrations.

## [0.0.3] - 2024-09-15

### Added

- Ability to register during scope.

### Changed

- Use `pkgroll` for build.

## [0.0.2] - 2024-08-31

### Changed

- Use `@abraham/reflection` instead of `reflect-metadata`.

## [0.0.1] - 2024-08-31

### Added

- Initial release.

[5.0.0]: https://github.com/shellicar/ecosystem/releases/tag/core-di@5.0.0
[4.0.2]: https://github.com/shellicar/ecosystem/releases/tag/core-di@4.0.2
[4.0.1]: https://github.com/shellicar/ecosystem/releases/tag/core-di@4.0.1
[4.0.0]: https://github.com/shellicar/ecosystem/releases/tag/core-di@4.0.0
[3.1.7]: https://github.com/shellicar/ecosystem/releases/tag/core-di@3.1.7
[3.1.6]: https://github.com/shellicar/ecosystem/releases/tag/3.1.6
[3.1.5]: https://github.com/shellicar/ecosystem/releases/tag/3.1.5
[3.1.4]: https://github.com/shellicar/ecosystem/releases/tag/3.1.4
[3.1.3]: https://github.com/shellicar/ecosystem/releases/tag/3.1.3
[3.1.2]: https://github.com/shellicar/ecosystem/releases/tag/3.1.2
[3.1.1]: https://github.com/shellicar/ecosystem/releases/tag/3.1.1
[3.1.0]: https://github.com/shellicar/ecosystem/releases/tag/3.1.0
[3.0.0]: https://github.com/shellicar/ecosystem/releases/tag/3.0.0
[2.4.0]: https://github.com/shellicar/ecosystem/releases/tag/2.4.0
[2.3.0]: https://github.com/shellicar/ecosystem/releases/tag/2.3.0
[2.2.0]: https://github.com/shellicar/ecosystem/releases/tag/2.2.0
[2.1.1]: https://github.com/shellicar/ecosystem/releases/tag/2.1.1
[2.1.0]: https://github.com/shellicar/ecosystem/releases/tag/2.1.0
[2.0.1]: https://github.com/shellicar/ecosystem/releases/tag/2.0.1
[2.0.0]: https://github.com/shellicar/ecosystem/releases/tag/2.0.0
[1.0.0]: https://github.com/shellicar/ecosystem/releases/tag/1.0.0
[0.1.0]: https://github.com/shellicar/ecosystem/releases/tag/0.1.0
[0.0.4]: https://github.com/shellicar/ecosystem/releases/tag/0.0.4
[0.0.3]: https://github.com/shellicar/ecosystem/releases/tag/0.0.3
[0.0.2]: https://github.com/shellicar/ecosystem/releases/tag/0.0.2
[0.0.1]: https://github.com/shellicar/ecosystem/releases/tag/0.0.1
