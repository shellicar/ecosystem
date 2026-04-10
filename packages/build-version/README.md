# @shellicar/build-version

[![npm package](https://img.shields.io/npm/v/@shellicar/build-version.svg)](https://npmjs.com/package/@shellicar/build-version)
[![build status](https://github.com/shellicar/build-version/actions/workflows/node.js.yml/badge.svg)](https://github.com/shellicar/build-version/actions/workflows/node.js.yml)

Build plugin that calculates and exposes version information through a virtual module import.

- ⚡️ Supports Vite, Webpack, Rspack, Vue CLI, Rollup, esbuild and more, powered by [unplugin].

## Installation & Quick Start

```sh
npm i --save @shellicar/build-version
```

```sh
pnpm add @shellicar/build-version
```

```ts
// vite.config.ts
import VersionPlugin from '@shellicar/build-version/vite'

export default defineConfig({
  plugins: [
    VersionPlugin({})
  ]
})
```

```ts
// main.ts
import version from '@shellicar/build-version/version'
```

<!-- BEGIN_ECOSYSTEM -->

## @shellicar TypeScript Ecosystem

### Core Libraries

- [`@shellicar/core-config`](https://github.com/shellicar/core-config) - A library for securely handling sensitive configuration values like connection strings, URLs, and secrets.
- [`@shellicar/core-di`](https://github.com/shellicar/core-di) - A basic dependency injection library.

### Reference Architectures

- [`@shellicar/reference-foundation`](https://github.com/shellicar/reference-foundation) - A comprehensive starter repository. Illustrates individual concepts.
- [`@shellicar/reference-enterprise`](https://github.com/shellicar/reference-enterprise) - A comprehensive starter repository. Can be used as the basis for creating a new Azure application workload.

### Build Tools

- [`@shellicar/build-clean`](https://github.com/shellicar/build-clean) - Build plugin that automatically cleans unused files from output directories.
- [`@shellicar/build-version`](https://github.com/shellicar/build-version) - Build plugin that calculates and exposes version information through a virtual module import.
- [`@shellicar/build-graphql`](https://github.com/shellicar/build-graphql) - Build plugin that loads GraphQL files and makes them available through a virtual module import.

### Framework Adapters

- [`@shellicar/svelte-adapter-azure-functions`](https://github.com/shellicar/svelte-adapter-azure-functions) - A [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) that builds your app into an Azure Function.
- [`@shellicar/cosmos-query-builder`](https://github.com/shellicar/cosmos-query-builder) - Helper class for type safe advanced queries for Cosmos DB (Sql Core).

### Logging & Monitoring

- [`@shellicar/winston-azure-application-insights`](https://github.com/shellicar/winston-azure-application-insights) - An [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights/) transport for [Winston](https://github.com/winstonjs/winston) logging library.
- [`@shellicar/pino-applicationinsights-transport`](https://github.com/shellicar/pino-applicationinsights-transport) - [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights) transport for [pino](https://github.com/pinojs/pino)

<!-- END_ECOSYSTEM -->

## Usage

### Importing Version Information

```ts
interface VersionInfo {
  buildDate: string;
  branch: string;
  sha: string;
  shortSha: string;
  commitDate: string;
  version: string;
}
```

```ts
import version from '@shellicar/build-version/version'

console.log(version)
```

### Version Calculators

#### Git Calculator

Uses pure git commands to calculate version numbers following mainline versioning:

- On main branch: increment patch version for each commit after a tag
- On feature branches: use base version with branch name and commit count suffix
- On PR branches: use PR number in version suffix

Example versions:

- Tagged commit on main: `1.2.3`
- Commits after tag on main: `1.2.4`, `1.2.5`
- Feature branch: `1.2.3-feature-name.2`
- PR branch: `1.2.3-PullRequest0123.2`

#### GitVersion Calculator

Uses the GitVersion CLI to calculate versions. Requires GitVersion to be installed.

#### Custom Calculator

Provide your own version calculation function:

```ts
VersionPlugin({
  versionCalculator: () => '1.0.0-custom'
})
```

## Options

See [types.ts](./packages/@shellicar/build-version/src/core/types.ts) for detailed options documentation.

## Credits

- [unplugin]
- [GitVersion]

[unplugin]: https://github.com/unjs/unplugin
[GitVersion]: https://gitversion.net
