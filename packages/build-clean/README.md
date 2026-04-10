# @shellicar/build-clean

[![npm package](https://img.shields.io/npm/v/@shellicar/build-clean.svg)](https://npmjs.com/package/@shellicar/build-clean)
[![build status](https://github.com/shellicar/ecosystem/actions/workflows/node.js.yml/badge.svg)](https://github.com/shellicar/ecosystem/actions/workflows/node.js.yml)

Build plugin that automatically cleans unused files from output directories.

- 🧹 **Cleans after build** - Removes unused files without deleting the entire output directory
- 🛡️ **Safe by default** - Dry-run mode, requires explicit destructive flag  
- 🔧 **Watch mode friendly** - No period with empty output directory

## Installation & Quick Start

```sh
npm i --save-dev @shellicar/build-clean
```

```sh
pnpm add -D @shellicar/build-clean
```

### esbuild

```ts
import cleanPlugin from '@shellicar/build-clean/esbuild'
import { build } from 'esbuild'

await build({
  entryPoints: ['src/main.ts'],
  outdir: 'dist',
  plugins: [
    cleanPlugin({
      // Required to actually delete files
      destructive: true
    })
  ]
})
```

### tsup

```ts
// tsup.config.ts
import cleanPlugin from '@shellicar/build-clean/esbuild'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  // Important: disable tsup's clean
  clean: false,
  esbuildPlugins: [
    cleanPlugin({
      destructive: true,
      verbose: true
    })
  ]
})
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
- [`@shellicar/graphql-codegen-treeshake`](https://github.com/shellicar/ecosystem/tree/main/packages/graphql-codegen-treeshake) - A graphql-codegen preset that tree-shakes unused types from TypeScript output.

### Framework

- [`@shellicar/svelte-adapter-azure-functions`](https://github.com/shellicar/ecosystem/tree/main/packages/svelte-adapter-azure-functions) - A [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) that builds your app into an Azure Function.
- [`@shellicar/cosmos-query-builder`](https://github.com/shellicar/ecosystem/tree/main/packages/cosmos-query-builder) - Helper class for type safe advanced queries for Cosmos DB (Sql Core).
- [`@shellicar/ui-shadcn`](https://github.com/shellicar/ui-shadcn) - Shared Svelte 5 component library built on shadcn-svelte with Tailwind CSS v4 theming.

### Logging & Monitoring

- [`@shellicar/winston-azure-application-insights`](https://github.com/shellicar/ecosystem/tree/main/packages/winston-azure-application-insights) - An [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights/) transport for [Winston](https://github.com/winstonjs/winston) logging library.
- [`@shellicar/pino-applicationinsights-transport`](https://github.com/shellicar/pino-applicationinsights-transport) - [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights) transport for [pino](https://github.com/pinojs/pino)

<!-- END_ECOSYSTEM -->

## Motivation

Existing solutions like tsup's `clean: true` delete the entire output directory, which causes issues:

- **Watch mode problems** - Other projects depending on these files can break when the directory is temporarily empty
- **Debugger performance** - Extra JavaScript files slow down Node.js debuggers when mapping to TypeScript sources, sometimes causing crashes

This plugin cleans after the build completes, removing only unused files while keeping the directory intact.

## Options

```ts
interface Options {
  /** Show detailed debug information */
  debug?: boolean
  
  /** Show verbose file-by-file processing */
  verbose?: boolean
  
  /** Actually delete files (default: false for safety) */
  destructive?: boolean
}
```

## Other Build Tools

The plugin supports other tools via [unplugin](https://github.com/unjs/unplugin):

```ts
// vite.config.ts
import cleanPlugin from '@shellicar/build-clean/vite'

export default defineConfig({
  plugins: [cleanPlugin({ destructive: true })]
})
```

## Credits & Inspiration

- [tsup](https://github.com/egoist/tsup)
- [esbuild](https://github.com/evanw/esbuild)
- [esbuild-clean-plugin](https://github.com/LinbuduLab/esbuild-plugins/tree/main/packages/esbuild-plugin-clean)
