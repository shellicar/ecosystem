# Changelog

## [3.1.6] - 2026-02-28

### Security

- Fixed [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) rollup arbitrary file write via path traversal

### Changed

- Updated all dependencies to latest versions

## [3.1.5] - 2026-02-23

### Fixed

- Fixed singleton disposal — root provider now disposes singleton `IDisposable` instances when disposed, matching MS DI behaviour
- Added `IDisposable` implementation to `IServiceProvider` interface

## [3.1.4] - 2026-02-22

### Fixed

- Fixed circular dependency detection — all circular dependencies now throw `CircularDependencyError` instead of silently stack overflowing
- Fixed self-dependency check that was unreachable due to comparing abstract class against concrete class

### Added

- New `CircularDependencyError` exported error class

## [3.1.3] - 2026-02-09

### Security

- Fixed [CVE-2026-25547](https://github.com/advisories/GHSA-7h2j-956f-4vf2) in @isaacs/brace-expansion

### Changed

- Moved pnpm overrides from package.json to pnpm-workspace.yaml
- Updated @shellicar/build-clean to 1.2.2, biome to 2.3.14
- Updated all dependencies to latest versions

## [3.1.2] - 2025-12-26

### Changed

- Updated all dependencies to latest versions

## [3.1.1] - 2025-10-24

### Changed

- Updated all dependencies to latest versions

## [3.1.0] - 2025-08-24

### Changed

- Updated all dependencies to latest versions

## [3.0.0] - 2025-08-03

### Added

- Enhanced error handling with better error message formatting showing both service identifier and implementation
- Support for error chaining in dependency resolution failures

### Changed

- Updated all dependencies to latest versions

## [2.4.0] - 2025-05-18

### Added

- Added null/undefined checks for service registration and implementation
- Added `InvalidServiceIdentifierError` for null/undefined service identifiers
- Added `InvalidImplementationError` for null/undefined implementations

## [2.3.0] - 2025-01-21

### Fixed

- Fix typed factory registration needing to be non-abstract

## [2.2.0] - 2025-01-10

### Fixed

- Fix export paths

## [2.1.1] - 2025-01-10

### Changed

- Change back to `tsup`

## [2.1.0] - 2025-01-08

### Structure

- Use `packages` and `examples` monorepo structure

### Packaging

- Use `tsup-node`
- Declare `@abraham/reflection` as dev dependency

### Documentation

- Add `readme` example project

## [2.0.1] - 2025-01-07

### Dependencies

- Update `cross-spawn`
  - See: [CVE-2024-21538](https://nvd.nist.gov/vuln/detail/CVE-2024-21538)

## [2.0.0] - 2025-01-05

### Breaking

- Some exported types changed names/functionality:
  - `LifetimeBuilder` -> `ILifetimeBuilder`
  - `ServiceBuilder` -> `IServiceBuilder`
  - `IServiceScope` -> `IResolutionScope` and `IScopedProvider`
- No longer export `ServiceCollection` and `ServiceProvider`
- Factory methods now take `IResolutionScope` instead of `IServiceScope & IServiceProvider`

### Added

- Extend `IServiceCollection.register` to accept multiple interfaces (ServiceIdentifiers).
  - All interfaces will resolve to the same implementation (and hence, instance, respectful of lifetime)
- Add `IServiceCollection.overrideLifetime` to allow overriding the lifetime of all service descriptors matching the service identifier (mainly for testing scenarios)

### Dev

- Switch to vitest ⚡ from mocha ☕.

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

Initial release.

[3.1.6]: https://github.com/shellicar/core-di/releases/tag/3.1.6
[3.1.5]: https://github.com/shellicar/core-di/releases/tag/3.1.5
[3.1.4]: https://github.com/shellicar/core-di/releases/tag/3.1.4
[3.1.3]: https://github.com/shellicar/core-di/releases/tag/3.1.3
[3.1.2]: https://github.com/shellicar/core-di/releases/tag/3.1.2
[3.1.1]: https://github.com/shellicar/core-di/releases/tag/3.1.1
[3.1.0]: https://github.com/shellicar/core-di/releases/tag/3.1.0
[3.0.0]: https://github.com/shellicar/core-di/releases/tag/3.0.0
[2.4.0]: https://github.com/shellicar/core-di/releases/tag/2.4.0
[2.3.0]: https://github.com/shellicar/core-di/releases/tag/2.3.0
[2.2.0]: https://github.com/shellicar/core-di/releases/tag/2.2.0
[2.1.1]: https://github.com/shellicar/core-di/releases/tag/2.1.1
[2.1.0]: https://github.com/shellicar/core-di/releases/tag/2.1.0
[2.0.1]: https://github.com/shellicar/core-di/releases/tag/2.0.1
[2.0.0]: https://github.com/shellicar/core-di/releases/tag/2.0.0
[1.0.0]: https://github.com/shellicar/core-di/releases/tag/1.0.0
[0.1.0]: https://github.com/shellicar/core-di/releases/tag/0.1.0
[0.0.4]: https://github.com/shellicar/core-di/releases/tag/0.0.4
[0.0.3]: https://github.com/shellicar/core-di/releases/tag/0.0.3
[0.0.2]: https://github.com/shellicar/core-di/releases/tag/0.0.2
[0.0.1]: https://github.com/shellicar/core-di/releases/tag/0.0.1
