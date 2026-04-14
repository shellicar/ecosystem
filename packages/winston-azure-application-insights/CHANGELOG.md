# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.5] - 2026-04-15

### Changed

- Updated dependencies to latest versions

## [6.0.4] - 2026-02-28

### Changed

- Removed unused `applicationinsightsv34` alias
- Updated development dependencies

### Security

- Fixed GHSA-7h2j-956f-4vf2 in brace-expansion ([GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2))
- Fixed GHSA-3ppc-4f35-3m26 in minimatch ([GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26))
- Fixed GHSA-7r86-cg39-jmmj in minimatch ([GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj))
- Fixed GHSA-23c5-xmqv-rm74 in minimatch ([GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74))
- Fixed GHSA-mw96-cpmx-2vgc in rollup ([GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc))
- Fixed GHSA-xxjr-mmjv-4gpg in lodash ([GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg))

## [6.0.3] - 2025-12-26

### Changed

- Updated all dependencies to latest versions

## [6.0.2] - 2025-10-24

### Changed

- Concatenate all string parameters into Trace message

## [6.0.1] - 2025-10-24

### Changed

- Updated all dependencies to latest versions

## [6.0.0] - 2025-09-19

### Added

- Factory functions for simpler setup
- Automatic Error object detection and extraction
- Smart error handling (Error as first parameter sends only exception)
- Multiple Error object support in single log call
- Object.create(null) support for GraphQL/Apollo compatibility
- Enhanced property extraction from splat parameters and defaultMeta
- Comprehensive test suite
- Extensible error detection with custom isError functions
- Customizable severity mapping for Winston levels
- Flexible trace and exception filtering
- Support for custom telemetry handlers

### Changed

- Complete ground-up rewrite of the library with new architecture, API, and approach to logging
- Improved Winston behaviour compatibility
- Better error message handling
- Enhanced property extraction logic

## [5.1.0] - 2025-08-03

### Changed

- Updated all dependencies to latest versions

## [5.0.7] - 2024-10-06

### Fixed

- Fix incorrect App Insights severity

## [5.0.6] - 2024-10-06

### Changed

- Update options and logging fields

## [5.0.5] - 2024-10-06

### Changed

- Expose level for creating logger

## [5.0.4] - 2024-09-30

### Changed

- Expose defaultMeta for helper function

## [5.0.3] - 2024-09-30

### Added

- Add more options for createWinstonLogger helper function

## [5.0.2] - 2024-09-30

### Added

- Add ITelemetryFilter to allow filtering traces and exceptions

### Changed

- Simplify tsup config

### Fixed

- Fix applicationinsights dependencies

## [5.0.1] - 2024-09-30

### Changed

- Use @biomejs/biome for linting

### Fixed

- Fix dependencies

## [5.0.0] - 2024-09-22

### Changed

- Forked from willmorgan/winston-azure-application-insights (originally bragma/winston-azure-application-insights)
- Update to applicationinsights 3.x
- Update to winston 3.x
- Use typescript

[6.0.5]: https://github.com/shellicar/ecosystem/releases/tag/winston-azure-application-insights@6.0.5
[6.0.4]: https://github.com/shellicar/ecosystem/releases/tag/6.0.4
[6.0.3]: https://github.com/shellicar/ecosystem/releases/tag/6.0.3
[6.0.2]: https://github.com/shellicar/ecosystem/releases/tag/6.0.2-preview.1
[6.0.1]: https://github.com/shellicar/ecosystem/releases/tag/6.0.1
[6.0.0]: https://github.com/shellicar/ecosystem/releases/tag/6.0.0
[5.1.0]: https://github.com/shellicar/ecosystem/releases/tag/5.1.0
[5.0.7]: https://github.com/shellicar/ecosystem/releases/tag/5.0.7
[5.0.6]: https://github.com/shellicar/ecosystem/releases/tag/5.0.6
[5.0.5]: https://github.com/shellicar/ecosystem/releases/tag/5.0.5
[5.0.4]: https://github.com/shellicar/ecosystem/releases/tag/5.0.4
[5.0.3]: https://github.com/shellicar/ecosystem/releases/tag/5.0.3
[5.0.2]: https://github.com/shellicar/ecosystem/releases/tag/5.0.2
[5.0.1]: https://github.com/shellicar/ecosystem/releases/tag/5.0.1
[5.0.0]: https://github.com/shellicar/ecosystem/releases/tag/winston-azure-application-insights@5.0.0
