# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.7] - 2026-04-15

### Changed

- Updated vite peer dependency from ^6 to ^7
- Updated dependencies to latest versions

### Security

- Fixed GHSA-r4q5-vmmm-2653 in follow-redirects ([GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653))

## [1.3.6] - 2026-03-28

### Changed

- Pinned esbuild version to silence false Dependabot CVE alerts

## [1.3.5] - 2026-03-28

### Changed

- Updated @shellicar/build-clean to 1.3.2
- Updated all dependencies to latest versions

### Security

- Fixed GHSA-38f7-945m-qr2g in effect ([GHSA-38f7-945m-qr2g](https://github.com/advisories/GHSA-38f7-945m-qr2g))
- Fixed GHSA-c2c7-rcm5-vvqj in picomatch ([GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj))
- Fixed GHSA-3v7f-55p6-f55p in picomatch ([GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p))
- Fixed GHSA-48c2-rrv3-qjmp in yaml ([GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp))
- Fixed GHSA-f886-m6hf-6m8v in brace-expansion ([GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v))

## [1.3.4] - 2026-02-28

### Changed

- Updated rollup to 4.59, @shellicar/build-clean to 1.2.3
- Updated all dependencies to latest versions

### Security

- Fixed GHSA-3ppc-4f35-3m26 in minimatch ([GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26))
- Fixed GHSA-7r86-cg39-jmmj in minimatch ([GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj))
- Fixed GHSA-23c5-xmqv-rm74 in minimatch ([GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74))
- Fixed GHSA-mw96-cpmx-2vgc in rollup ([GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc))
- Fixed GHSA-7gcc-r8m5-44qm in koa ([GHSA-7gcc-r8m5-44qm](https://github.com/advisories/GHSA-7gcc-r8m5-44qm))
- Fixed GHSA-5c6j-r48x-rmvq in serialize-javascript ([GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq))
- Fixed GHSA-2g4f-4pwh-qvx6 in ajv ([GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6))

## [1.3.3] - 2026-02-05

### Changed

- Updated @shellicar/build-clean to 1.2.1
- Updated all dependencies to latest versions

### Security

- Fixed GHSA-7h2j-956f-4vf2 in @isaacs/brace-expansion ([GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2))

## [1.3.2] - 2025-12-26

### Changed

- Updated all dependencies to latest versions

## [1.3.1] - 2025-10-24

### Changed

- Updated all dependencies to latest versions

## [1.3.0] - 2025-08-27

### Changed

- Updated all dependencies to latest versions

## [1.2.0] - 2025-08-03

### Changed

- Updated all dependencies to latest versions

## [1.1.0] - 2025-05-08

### Added

- `win32` support (dotnet-gitversion.exe)
- `strict` option (raise error if gitversion fails, defaults to false)

## [1.0.1] - 2025-01-16

### Fixed

- Incorrect export

## [1.0.0] - 2025-01-16

### Changed

- Use `packages` and `examples` monorepo structure
- Explicitly export types.

## [0.2.1] - 2025-01-06

### Changed

- Use virtual module for vite
- Force plugin to run first with `enforce: 'pre'`

## [0.2.0] - 2025-01-05

### Fixed

- Issues with vite plugin

## [0.1.1] - 2025-01-05

### Fixed

- Fix missing README

## [0.1.0] - 2025-01-05

### Added

- Initial release.

[1.3.7]: https://github.com/shellicar/ecosystem/releases/tag/build-version@1.3.7
[1.3.6]: https://github.com/shellicar/ecosystem/releases/tag/1.3.6
[1.3.5]: https://github.com/shellicar/ecosystem/releases/tag/1.3.5
[1.3.4]: https://github.com/shellicar/ecosystem/releases/tag/1.3.4
[1.3.3]: https://github.com/shellicar/ecosystem/releases/tag/1.3.3
[1.3.2]: https://github.com/shellicar/ecosystem/releases/tag/1.3.2
[1.3.1]: https://github.com/shellicar/ecosystem/releases/tag/1.3.1
[1.3.0]: https://github.com/shellicar/ecosystem/releases/tag/1.3.0
[1.2.0]: https://github.com/shellicar/ecosystem/releases/tag/1.2.0
[1.1.0]: https://github.com/shellicar/ecosystem/releases/tag/1.1.0
[1.0.1]: https://github.com/shellicar/ecosystem/releases/tag/1.0.1
[1.0.0]: https://github.com/shellicar/ecosystem/releases/tag/1.0.0
[0.2.1]: https://github.com/shellicar/ecosystem/releases/tag/0.2.1
[0.2.0]: https://github.com/shellicar/ecosystem/releases/tag/0.2.0
[0.1.1]: https://github.com/shellicar/ecosystem/releases/tag/0.1.1
[0.1.0]: https://github.com/shellicar/ecosystem/releases/tag/0.1.0
