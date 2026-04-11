# Changelog

## [1.4.3] - 2026-03-01

### Security

- Fixed [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq) in serialize-javascript

### Changed

- Updated all dependencies to latest versions

## [1.4.2] - 2026-02-28

### Security

- Fixed [CVE-2026-26996](https://github.com/advisories/GHSA-3ppc-4f35-3m26) in minimatch
- Fixed [CVE-2025-69873](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) in ajv
- Fixed [CVE-2026-2327](https://github.com/advisories/GHSA-38c4-r59v-3vqw) in markdown-it

### Changed

- Updated @shellicar/build-clean to 1.2.3, rollup to 4.59.0
- Updated all dependencies to latest versions

## [1.4.1] - 2026-02-09

### Security

- Fixed [CVE-2026-25547](https://github.com/advisories/GHSA-7h2j-956f-4vf2) in @isaacs/brace-expansion

### Changed

- Updated @shellicar/build-clean to 1.2.2, biome to 2.3.14
- Updated all dependencies to latest versions

## [1.4.0] - 2026-01-24

### Added

- Added `features` option to enable/disable specific plugin features
- Added esbuild watch mode feature for automatic rebuilds (enabled by default)
- Added Vite watch mode and HMR (Hot Module Replacement) feature (enabled by default)
- Added `errorPolicy` option to control how errors are handled during builds

### Changed

- Updated `unplugin` dependency from ^2.3.11 to ^3.0.0
- Explicitly exported all public types that were previously only available as dependencies of other types

### Deprecated

- `ignoreErrors` option is now deprecated in favour of using `errorPolicy`

## [1.3.0] - 2026-01-05

### Added

- Added `globOptions` to support passing all glob options directly when finding GraphQL files

### Changed

- Adds support for `IgnoreLike` and `string[]` on `globIgnore` option, in addition to `string`.

### Deprecated

- `globIgnore` is now deprecated in favor of using `globOptions.ignore`

## [1.2.2] - 2025-12-26

### Changed

- Updated all dependencies to latest versions

## [1.2.1] - 2025-10-24

### Changed

- Updated all dependencies to latest versions

## [1.2.0] - 2025-08-27

### Changed

- Updated all dependencies to latest versions

## [1.1.0] - 2025-08-03

### Changed

- Updated all dependencies to latest versions

## [1.0.1] - 2025-01-16

### Fixed

- Export types explicitly
- Fix logging prefix

## [1.0.0] - 2025-01-09

### Changed

- Force plugin to run in `pre` mode
- Refactor and simplify plugin code

### Structure

- Use `packages` and `examples` monorepo structure

## [0.1.1] - 2025-01-05

### Fixed

Fix missing README

## [0.1.0] - 2025-01-05

Initial release.

[1.4.3]: https://github.com/shellicar/build-graphql/releases/tag/1.4.3
[1.4.2]: https://github.com/shellicar/build-graphql/releases/tag/1.4.2
[1.4.1]: https://github.com/shellicar/build-graphql/releases/tag/1.4.1
[1.4.0]: https://github.com/shellicar/build-graphql/releases/tag/1.4.0
[1.3.0]: https://github.com/shellicar/build-graphql/releases/tag/1.3.0
[1.2.2]: https://github.com/shellicar/build-graphql/releases/tag/1.2.2
[1.2.1]: https://github.com/shellicar/build-graphql/releases/tag/1.2.1
[1.2.0]: https://github.com/shellicar/build-graphql/releases/tag/1.2.0
[1.1.0]: https://github.com/shellicar/build-graphql/releases/tag/1.1.0
[1.0.1]: https://github.com/shellicar/build-graphql/releases/tag/1.0.1
[1.0.0]: https://github.com/shellicar/build-graphql/releases/tag/1.0.0
[0.1.1]: https://github.com/shellicar/build-graphql/releases/tag/0.1.1
[0.1.0]: https://github.com/shellicar/build-graphql/releases/tag/0.1.0
