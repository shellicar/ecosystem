# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-07-16

Rebuilt on `@shellicar/core-di-engine`, the shared engine that core-di also composes from. The version jumps to match core-di and core-di-engine: the three packages now release in lockstep so a single engine copy resolves across them. Lite keeps its purpose: everything is a singleton, everything is constructed at `buildProvider()`, and a resolve after build is a pure lookup.

### Added

- Shared identity across faces: every identifier declared from one `register()` call resolves to the same instance, including when the instance comes from a factory.
- `forward(source).to(target)` to redirect one identifier to another registration.
- `validate()` reports wiring problems (missing registrations, cycles) from the static graph without constructing anything, for CI.
- `resolveAll(identifier)` returns one instance per registration.

### Changed

- **Breaking:** the registration API is now the same grammar as core-di: `register(Implementation).as(Identifier)`, `.asSelf()`, and `.using(factory)` or `.using([deps], factory)`. `register(identifier).to(implementation)` is gone.
- **Breaking:** registering the same identifier twice no longer throws at registration. Multiple registrations are allowed; `resolve()` throws `MultipleRegistrationError` for an ambiguous identifier, and `resolveAll()` returns every registration.
- Errors and `dependsOn` come from the shared engine, so `instanceof` checks and decorator metadata are compatible with core-di.

### Removed

- `DuplicateRegistrationError`. Duplicate registration is no longer an error at register time.

## [1.0.2] - 2026-05-17

### Changed

- Updated patch and minor dependencies

## [1.0.1] - 2026-05-08

### Changed

- Updated patch dependencies

### Security

- Fixed GHSA-qx2v-qp2m-jg93 in postcss ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93))

## [1.0.0] - 2026-04-14

### Added

- Initial release: minimal DI container with eager singleton resolution

[5.0.0]: https://github.com/shellicar/ecosystem/releases/tag/core-di-lite@5.0.0
[1.0.2]: https://github.com/shellicar/ecosystem/releases/tag/core-di-lite@1.0.2
[1.0.1]: https://github.com/shellicar/ecosystem/releases/tag/core-di-lite@1.0.1
[1.0.0]: https://github.com/shellicar/ecosystem/releases/tag/core-di-lite@1.0.0
