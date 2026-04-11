# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
