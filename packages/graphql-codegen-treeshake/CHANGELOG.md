# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-11-08

### Changed

- Generated enums are string-literal unions instead of TypeScript enums, custom scalars are typed unknown instead of any, and result types no longer include __typename (client-preset 6 defaults)
- Moved to GraphQL Codegen 6 (@graphql-codegen/client-preset 6, @graphql-codegen/typescript 6). The preset now passes through to client-preset, so its output is identical to preset: 'client'
- Persisted documents now default to sha256 hashes instead of sha1 (client-preset 6 default)

### Deprecated

- Deprecated in favour of preset: 'client' from @graphql-codegen/client-preset, which on GraphQL Codegen 6 generates only the types your operations and fragments reach

### Removed

- Generated output no longer includes schema object and interface types, Query, Mutation and Subscription and their Args types, or the Scalars, Maybe, InputMaybe and Make* helpers. Input types, enums and operation and fragment result types remain

### Security

- Fixed GHSA-7mx3-vvmw-hjmv in @graphql-tools/utils ([GHSA-7mx3-vvmw-hjmv](https://github.com/advisories/GHSA-7mx3-vvmw-hjmv))
- Fixed GHSA-c4qx-w738-7hr3 in @graphql-tools/utils ([GHSA-c4qx-w738-7hr3](https://github.com/advisories/GHSA-c4qx-w738-7hr3))

## [1.0.3] - 2026-05-17

### Changed

- Updated patch dependencies

## [1.0.2] - 2026-05-08

### Changed

- Updated patch dependencies

### Security

- Fixed GHSA-qx2v-qp2m-jg93 in postcss ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93))

## [1.0.1] - 2026-04-15

### Changed

- Updated dependencies to latest versions

## [1.0.0] - 2026-03-11

### Added

- Initial release.

[2.0.0]: https://github.com/shellicar/ecosystem/releases/tag/graphql-codegen-treeshake@2.0.0
[1.0.3]: https://github.com/shellicar/ecosystem/releases/tag/graphql-codegen-treeshake@1.0.3
[1.0.2]: https://github.com/shellicar/ecosystem/releases/tag/graphql-codegen-treeshake@1.0.2
[1.0.1]: https://github.com/shellicar/ecosystem/releases/tag/graphql-codegen-treeshake@1.0.1
[1.0.0]: https://github.com/shellicar/graphql-codegen-treeshake/releases/tag/1.0.0
