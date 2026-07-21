# @shellicar/build-version

[![npm package](https://img.shields.io/npm/v/@shellicar/build-version.svg)](https://npmjs.com/package/@shellicar/build-version)
[![build status](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml)

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
- [`@shellicar/build-version`](https://github.com/shellicar/ecosystem/tree/main/packages/build-version) - Build plugin that calculates and exposes version information through a virtual module import.
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

### Strategies

Version resolution is an ordered list of strategies: the first one to produce a
result wins. The default list covers the common cases without any configuration:

```ts
VersionPlugin({})
// same as:
VersionPlugin({
  strategies: [Strategies.envOverride(), Strategies.git(), Strategies.gitversion(), Strategies.fallback('0.1.0')],
})
```

- **`Strategies.envOverride()`** — uses `BUILD_VERSION_OVERRIDE` (and optionally
  `BUILD_BRANCH_OVERRIDE`) when a CI job already knows the exact version it's building.
- **`Strategies.git({ packageName })`** — pure git commands, no GitVersion install
  required. Following mainline versioning:
  - Tagged commit on `main`: reports the tag exactly, e.g. `1.2.3` or `1.2.3-beta.1`.
  - `main` past the last tag: keeps counting from it, e.g. `1.2.3-beta.1.2`.
  - Feature branch: base version with branch name and commit count, e.g. `1.2.3-feature-name.2`.
  - PR branch: base version with PR number, e.g. `1.2.3-PullRequest-0123.2`.
  - `packageName` scopes tag matching to `<packageName>@*`, so the right tag is picked
    out of several packages' tags that can share a commit in a monorepo.
- **`Strategies.gitversion({ strict })`** — shells out to the GitVersion CLI. Requires
  GitVersion to be installed. `strict: true` throws instead of falling through to the
  next strategy when GitVersion fails.
- **`Strategies.fallback(version)`** — never declines; the last-resort default when
  nothing else resolves (e.g. outside a git working tree).

Override the whole list, or just one strategy, by passing your own array:

```ts
VersionPlugin({
  strategies: [Strategies.fallback('1.0.0-custom')],
})
```

**`Strategies.custom(strategy)`** wraps your own `VersionStrategy` function
(`() => { version: string; branch: string } | null`, returning `null` to decline
and fall through to the next one) — for anything the built-in strategies don't cover:

```ts
VersionPlugin({
  strategies: [Strategies.custom(() => ({ version: '1.0.0-custom', branch: 'main' }))],
})
```

> Upgrading from 1.x? See [MIGRATION.md](./MIGRATION.md) — the `versionCalculator`
> option has been replaced by `strategies`.

## Options

See [types.ts](./src/core/types.ts) for detailed options documentation.

## Credits

- [unplugin]
- [GitVersion]

[unplugin]: https://github.com/unjs/unplugin
[GitVersion]: https://gitversion.net
