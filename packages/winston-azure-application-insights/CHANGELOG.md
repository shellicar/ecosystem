# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.8] - 2026-06-19

### Fixed

- Don't force both versions of applicationinsights on consumers

## [6.0.7] - 2026-05-17

### Changed

- Updated patch dependencies

### Security

- Fixed GHSA-2pr8-phx7-x9h3 in protobufjs ([GHSA-2pr8-phx7-x9h3](https://github.com/advisories/GHSA-2pr8-phx7-x9h3))
- Fixed GHSA-66ff-xgx4-vchm in protobufjs ([GHSA-66ff-xgx4-vchm](https://github.com/advisories/GHSA-66ff-xgx4-vchm))
- Fixed GHSA-685m-2w69-288q in protobufjs ([GHSA-685m-2w69-288q](https://github.com/advisories/GHSA-685m-2w69-288q))
- Fixed GHSA-75px-5xx7-5xc7 in protobufjs ([GHSA-75px-5xx7-5xc7](https://github.com/advisories/GHSA-75px-5xx7-5xc7))
- Fixed GHSA-fx83-v9x8-x52w in protobufjs ([GHSA-fx83-v9x8-x52w](https://github.com/advisories/GHSA-fx83-v9x8-x52w))
- Fixed GHSA-jvwf-75h9-cwgg in protobufjs ([GHSA-jvwf-75h9-cwgg](https://github.com/advisories/GHSA-jvwf-75h9-cwgg))
- Fixed GHSA-q6x5-8v7m-xcrf in protobufjs ([GHSA-q6x5-8v7m-xcrf](https://github.com/advisories/GHSA-q6x5-8v7m-xcrf))
- Fixed GHSA-q7rr-3cgh-j5r3 in @opentelemetry/sdk-node ([GHSA-q7rr-3cgh-j5r3](https://github.com/advisories/GHSA-q7rr-3cgh-j5r3))

## [6.0.6] - 2026-05-08

### Changed

- Updated patch dependencies

### Security

- Fixed GHSA-qx2v-qp2m-jg93 in postcss ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93))
- Fixed GHSA-xq3m-2v4x-88gg in protobufjs ([GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg))

## [6.0.5] - 2026-04-15

### Changed

- Updated dependencies to latest versions

## [6.0.4] - 2026-02-28

### Changed

- Removed unused `applicationinsightsv34` alias
- Updated development dependencies

### Security

- Fixed GHSA-23c5-xmqv-rm74 in minimatch ([GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74))
- Fixed GHSA-3ppc-4f35-3m26 in minimatch ([GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26))
- Fixed GHSA-7h2j-956f-4vf2 in brace-expansion ([GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2))
- Fixed GHSA-7r86-cg39-jmmj in minimatch ([GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj))
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

- Automatic Error object detection and extraction
- Comprehensive test suite
- Customizable severity mapping for Winston levels
- Enhanced property extraction from splat parameters and defaultMeta
- Extensible error detection with custom isError functions
- Factory functions for simpler setup
- Flexible trace and exception filtering
- Multiple Error object support in single log call
- Object.create(null) support for GraphQL/Apollo compatibility
- Smart error handling (Error as first parameter sends only exception)
- Support for custom telemetry handlers

### Changed

- Better error message handling
- Complete ground-up rewrite of the library with new architecture, API, and approach to logging
- Enhanced property extraction logic
- Improved Winston behaviour compatibility

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

- Forked from willmorgan/winston-azure-application-insights (originally bragma/winston-azure-application-insights)
- Update to applicationinsights 3.x
- Update to winston 3.x
- Use @biomejs/biome for linting
- Use typescript

### Fixed

- Fix dependencies

[6.0.8]: https://github.com/shellicar/ecosystem/releases/tag/winston-azure-application-insights@6.0.8
[6.0.7]: https://github.com/shellicar/ecosystem/releases/tag/winston-azure-application-insights@6.0.7
[6.0.6]: https://github.com/shellicar/ecosystem/releases/tag/winston-azure-application-insights@6.0.6
[6.0.5]: https://github.com/shellicar/ecosystem/releases/tag/winston-azure-application-insights@6.0.5
[6.0.4]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/6.0.4
[6.0.3]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/6.0.3
[6.0.2]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/6.0.2-preview.1
[6.0.1]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/6.0.1
[6.0.0]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/6.0.0
[5.1.0]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.1.0
[5.0.7]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.0.7
[5.0.6]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.0.6
[5.0.5]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.0.5
[5.0.4]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.0.4
[5.0.3]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.0.3
[5.0.2]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.0.2
[5.0.1]: https://github.com/shellicar/winston-azure-application-insights/releases/tag/5.0.1
