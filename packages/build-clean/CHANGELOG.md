# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2026-03-28

### Changed

- Pin esbuild version to silence false Dependabot CVE alerts

## [1.3.1] - 2026-03-28

### Changed

- Updated all dependencies to latest versions

### Security

- Fixed CVE-2026-32887 in effect ([GHSA-38f7-945m-qr2g](https://github.com/advisories/GHSA-38f7-945m-qr2g))
- Fixed CVE-2026-33671 in picomatch ([GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj))
- Fixed CVE-2026-33750 in brace-expansion ([GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v))

## [1.3.0] - 2026-03-11

### Added

- Added rolldown plugin export (@shellicar/build-clean/rolldown)

### Changed

- Updated all dependencies to latest versions

## [1.2.4] - 2026-03-01

### Changed

- Updated all dependencies to latest versions

### Security

- Fixed GHSA-5c6j-r48x-rmvq in serialize-javascript ([GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq))

## [1.2.3] - 2026-02-28

### Security

- Fixed CVE-2026-27959 in koa ([GHSA-7gcc-r8m5-44qm](https://github.com/advisories/GHSA-7gcc-r8m5-44qm))
- Fixed GHSA-3ppc-4f35-3m26 in minimatch ([GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26))

## [1.2.2] - 2026-02-09

### Security

- Fixed CVE-2025-68458 in webpack ([GHSA-8fgc-7cc6-rx7x](https://github.com/advisories/GHSA-8fgc-7cc6-rx7x))
- Fixed CVE-2025-68157 in webpack ([GHSA-38r7-794h-5758](https://github.com/advisories/GHSA-38r7-794h-5758))

## [1.2.1] - 2026-02-04

### Security

- Fixed CVE-2026-25547 in @isaacs/brace-expansion ([GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2))

## [1.2.0] - 2026-02-02

### Added

- Added features option to enable/disable specific plugin features
- Added empty directory removal feature (enabled by default)
- Added custom logger support via logger option

## [1.1.3] - 2026-02-02

### Fixed

- Fix audit vulnerabilities

## [1.1.2] - 2025-10-24

### Fixed

- Fix audit vulnerabilities

## [1.1.1] - 2025-10-24

### Changed

- Updated all dependencies to latest versions

## [1.1.0] - 2025-09-22

### Changed

- Prevent errors when deleting files from aborting the build process.

## [1.0.0] - 2025-08-27

### Added

- Initial release.

[1.3.2]: https://github.com/shellicar/ecosystem/releases/tag/1.3.2
[1.3.1]: https://github.com/shellicar/ecosystem/releases/tag/1.3.1
[1.3.0]: https://github.com/shellicar/ecosystem/releases/tag/1.3.0
[1.2.4]: https://github.com/shellicar/ecosystem/releases/tag/1.2.4
[1.2.3]: https://github.com/shellicar/ecosystem/releases/tag/1.2.3
[1.2.2]: https://github.com/shellicar/ecosystem/releases/tag/1.2.2
[1.2.1]: https://github.com/shellicar/ecosystem/releases/tag/1.2.1
[1.2.0]: https://github.com/shellicar/ecosystem/releases/tag/1.2.0
[1.1.3]: https://github.com/shellicar/ecosystem/releases/tag/1.1.3
[1.1.2]: https://github.com/shellicar/ecosystem/releases/tag/1.1.2
[1.1.1]: https://github.com/shellicar/ecosystem/releases/tag/1.1.1
[1.1.0]: https://github.com/shellicar/ecosystem/releases/tag/1.1.0
[1.0.0]: https://github.com/shellicar/ecosystem/releases/tag/1.0.0
