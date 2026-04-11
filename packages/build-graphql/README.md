# @shellicar/build-graphql

[![npm package](https://img.shields.io/npm/v/@shellicar/build-graphql.svg)](https://npmjs.com/package/@shellicar/build-graphql)
[![build status](https://github.com/shellicar/ecosystem/actions/workflows/node.js.yml/badge.svg)](https://github.com/shellicar/ecosystem/actions/workflows/node.js.yml)

Build plugin that loads GraphQL files and makes them available through a virtual module import.

- ⚡️ Supports Vite, Webpack, Rspack, Vue CLI, Rollup, esbuild and more, powered by [unplugin].

## Installation & Quick Start

```sh
npm i --save @shellicar/build-graphql
```

```sh
pnpm add @shellicar/build-graphql
```

```ts
// build.ts
import GraphQLPlugin from '@shellicar/build-graphql/esbuild'

await build({
  // other options
  plugins: [
    GraphQLPlugin({ 
      globPattern: 'src/**/*.graphql'
    })
  ]
})
```

```ts
// vite.config.ts
import GraphQLPlugin from '@shellicar/build-graphql/vite'

export default defineConfig({
  // other options
  plugins: [
    GraphQLPlugin({ 
      globPattern: 'src/**/*.graphql'
    })
  ],
});
```

```ts
// main.ts
import typedefs from '@shellicar/build-graphql/typedefs'
```

<!-- BEGIN_ECOSYSTEM -->

## @shellicar TypeScript Ecosystem

### Core Libraries

- [`@shellicar/core-config`](https://github.com/shellicar/ecosystem/tree/main/packages/core-config) - A library for securely handling sensitive configuration values like connection strings, URLs, and secrets.
- [`@shellicar/core-di`](https://github.com/shellicar/ecosystem/tree/main/packages/core-di) - A basic dependency injection library.

### Reference Architectures

- [`@shellicar/reference-foundation`](https://github.com/shellicar/reference-foundation) - A comprehensive starter repository. Illustrates individual concepts.
- [`@shellicar/reference-enterprise`](https://github.com/shellicar/reference-enterprise) - A comprehensive starter repository. Can be used as the basis for creating a new Azure application workload.

### Build Tools

- [`@shellicar/build-clean`](https://github.com/shellicar/ecosystem/tree/main/packages/build-clean) - Build plugin that automatically cleans unused files from output directories.
- [`@shellicar/build-version`](https://github.com/shellicar/ecosystem/tree/main/packages/build-version) - Build plugin that calculates and exposes version information through a virtual module import.
- [`@shellicar/build-graphql`](https://github.com/shellicar/ecosystem/tree/main/packages/build-graphql) - Build plugin that loads GraphQL files and makes them available through a virtual module import.

### Framework

- [`@shellicar/svelte-adapter-azure-functions`](https://github.com/shellicar/ecosystem/tree/main/packages/svelte-adapter-azure-functions) - A [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) that builds your app into an Azure Function.
- [`@shellicar/cosmos-query-builder`](https://github.com/shellicar/ecosystem/tree/main/packages/cosmos-query-builder) - Helper class for type safe advanced queries for Cosmos DB (Sql Core).
- [`@shellicar/ui-shadcn`](https://github.com/shellicar/ui-shadcn) - Shared Svelte 5 component library built on shadcn-svelte with Tailwind CSS v4 theming.

### Logging & Monitoring

- [`@shellicar/winston-azure-application-insights`](https://github.com/shellicar/ecosystem/tree/main/packages/winston-azure-application-insights) - An [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights/) transport for [Winston](https://github.com/winstonjs/winston) logging library.
- [`@shellicar/pino-applicationinsights-transport`](https://github.com/shellicar/pino-applicationinsights-transport) - [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights) transport for [pino](https://github.com/pinojs/pino)

<!-- END_ECOSYSTEM -->

## Usage

```sh
pnpm add -D @shellicar/build-graphql
```

### With esbuild

```ts
import graphqlPlugin from '@shellicar/build-graphql/esbuild';
import type { Options } from '@shellicar/build-graphql/types';
import { build } from 'esbuild';

const options: Options = {
  globPattern: '../**/*.graphql',
  debug: true,
};

await build({
  entryPoints: ['src/main.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node20',
  tsconfig: 'tsconfig.json',
  plugins: [graphqlPlugin(options)],
});
```

### With Vite

```ts

```

### Importing GraphQL Documents

```ts
import typedefs from '@shellicar/build-graphql/typedefs'
```

See [examples](../../examples/build-graphql) for full working implementations.

## Options

See [types.ts](./src/core/types.ts) for detailed options documentation.

## Credits

- [@luckycatfactory/esbuild-graphql-loader]
- [unplugin]

[@luckycatfactory/esbuild-graphql-loader]: https://github.com/luckycatfactory/esbuild-graphql-loader
[unplugin]: https://github.com/unjs/unplugin
