# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.4] - 2026-02-28

### Changed

- Updated @shellicar/build-clean to 1.2.3, biome to 2.4.4
- Updated all dependencies to latest versions

### Security

- Fixed CVE-2026-25547 in @isaacs/brace-expansion ([GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2))
- Fixed CVE-2026-26996 in minimatch ([GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26))

## [2.1.3] - 2026-01-20

### Fixed

- Export factory interface returned by `createFactory`

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

### Changed

- Exports now use abstract interfaces instead of concrete classes for better type safety
- `SecureString`, `SecureConnectionString`, and `SecureURL` classes are no longer exported, use `createFactory()` instead
- `createFactory()` now takes a configuration object instead of a string parameter
- Extracted proper abstract interfaces for better type safety and extensibility
- Moved type definitions to dedicated interfaces file for better organization

### Security

- Replaced plain text memory storage with AES-256-GCM encryption for all secret values
- Added `EncryptedValue` class for secure in-memory storage with unique per-instance encryption keys
- Added configurable encryption provider to allow custom encryption implementations

## [1.0.1] - 2025-01-08

### Changed

- Use `hs256` prefix for HMAC-SHA256
- Fix zod example in README

## [1.0.0] - 2025-01-08

### Added

- `secret` parameter to use `HMAC-SHA256`
- `createFactory` method to simplify secret creation
- Add `readme` example project

### Changed

- Examples in README
- Use `packages` and `examples` monorepo structure
- Use `tsup-node`

## [0.1.0] - 2025-01-07

### Added

- Initial release

[2.1.4]: https://github.com/shellicar/ecosystem/releases/tag/2.1.4
[2.1.3]: https://github.com/shellicar/ecosystem/releases/tag/2.1.3
[2.1.2]: https://github.com/shellicar/ecosystem/releases/tag/2.1.2
[2.1.1]: https://github.com/shellicar/ecosystem/releases/tag/2.1.1
[2.1.0]: https://github.com/shellicar/ecosystem/releases/tag/2.1.0
[2.0.0]: https://github.com/shellicar/ecosystem/releases/tag/2.0.0
[1.0.1]: https://github.com/shellicar/ecosystem/releases/tag/1.0.1
[1.0.0]: https://github.com/shellicar/ecosystem/releases/tag/1.0.0
[0.1.0]: https://github.com/shellicar/ecosystem/releases/tag/0.1.0
