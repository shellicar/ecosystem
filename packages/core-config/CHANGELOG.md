# Changelog

## [2.1.4] - 2026-02-28

### Security

- Fixed [CVE-2026-25547](https://github.com/advisories/GHSA-7h2j-956f-4vf2) in @isaacs/brace-expansion
- Fixed [CVE-2026-26996](https://github.com/advisories/GHSA-3ppc-4f35-3m26) in minimatch

### Changed

- Updated @shellicar/build-clean to 1.2.3, biome to 2.4.4
- Updated all dependencies to latest versions

## [2.1.3] - 2026-01-20

### Fixed

- Export factory interface returned by `createFactory`;

## [2.1.2] - 2025-12-26

### Changed

- Updated all dependencies to latest versions

## [2.1.1] - 2025-10-24

### Changed

- Updated all dependencies to latest versions

## [2.1.0] - 2025-08-24

### Changed

- Updated all dependencies to latest versions

## [2.0.0] - 2025-08-03

### ⚠️ BREAKING CHANGES

- Exports now use abstract interfaces instead of concrete classes for better type safety
- `SecureString`, `SecureConnectionString`, and `SecureURL` classes are no longer exported - use `createFactory()` instead
- `createFactory()` now takes a configuration object instead of a string parameter

### Security

- Replaced plain text memory storage with AES-256-GCM encryption for all secret values
- Added `EncryptedValue` class for secure in-memory storage with unique per-instance encryption keys
- Added configurable encryption provider to allow custom encryption implementations

### Refactoring

- Extracted proper abstract interfaces for better type safety and extensibility
- Moved type definitions to dedicated interfaces file for better organization

## [1.0.1] - 2025-01-08

## Updated

- Use `hs256` prefix for HMAC-SHA256
- Fix zod example in README

## [1.0.0] - 2025-01-08

## Added

- `secret` parameter to use `HMAC-SHA256`
- `createFactory` method to simplify secret creation

## Updates

- Examples in README

## Structure

- Use `packages` and `examples` monorepo structure

## Packaging

- Use `tsup-node`

## Documentation

- Add `readme` example project

## [0.1.0] - 2025-01-07

Initial release.

[2.1.4]: https://github.com/shellicar/core-config/releases/tag/2.1.4
[2.1.3]: https://github.com/shellicar/core-config/releases/tag/2.1.3
[2.1.2]: https://github.com/shellicar/core-config/releases/tag/2.1.2
[2.1.1]: https://github.com/shellicar/core-config/releases/tag/2.1.1
[2.1.0]: https://github.com/shellicar/core-config/releases/tag/2.1.0
[2.0.0]: https://github.com/shellicar/core-config/releases/tag/2.0.0
[1.0.1]: https://github.com/shellicar/core-config/releases/tag/1.0.1
[1.0.0]: https://github.com/shellicar/core-config/releases/tag/1.0.0
[0.1.0]: https://github.com/shellicar/core-config/releases/tag/0.1.0
