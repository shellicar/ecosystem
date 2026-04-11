# @shellicar/build-azure-local-settings

[![npm package](https://img.shields.io/npm/v/@shellicar/build-azure-local-settings.svg)](https://npmjs.com/package/@shellicar/build-azure-local-settings)
[![build status](https://github.com/shellicar/build-azure-local-settings/actions/workflows/node.js.yml/badge.svg)](https://github.com/shellicar/build-azure-local-settings/actions/workflows/node.js.yml)

Build plugin that loads Azure `local.settings.json` with [Key Vault reference](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) resolution for non-Azure-Functions apps.

- **Loads `local.settings.json`** - Reads values and sets them as `process.env` variables before your app starts
- **Resolves Key Vault references** - Fetches secrets from Azure Key Vault using `DefaultAzureCredential` (e.g. Azure CLI)
- **Local development only** - Controlled via the `loadLocalSettings` option, typically tied to watch/dev mode

## Installation & Quick Start

```sh
npm i --save-dev @shellicar/build-azure-local-settings
```

```sh
pnpm add -D @shellicar/build-azure-local-settings
```

### esbuild

```ts
// build.ts
import plugin from '@shellicar/build-azure-local-settings/esbuild';
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [
    plugin({
      mainModule: './src/main.ts',
      loadLocalSettings: watch,
    }),
  ],
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  ctx.dispose();
}
```

### tsup

```ts
// tsup.config.ts
import plugin from '@shellicar/build-azure-local-settings/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  esbuildPlugins: [
    plugin({
      mainModule: './src/main.ts',
    }),
  ],
});
```

## How It Works

The plugin generates a virtual entry point that:

1. Reads `local.settings.json` from the working directory
2. Resolves any [Key Vault references](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) to their secret values
3. Sets the resolved values as `process.env` variables
4. Imports and runs your main module

Your application code accesses the values through `process.env` as normal:

```ts
// src/main.ts
export default async () => {
  console.log('Greeting:', process.env.GREETING_MESSAGE);
};
```

See [examples](./examples) for full working implementations.

<!-- BEGIN_ECOSYSTEM -->

## @shellicar TypeScript Ecosystem

### Core Libraries

- [`@shellicar/core-config`](https://github.com/shellicar/core-config) - A library for securely handling sensitive configuration values like connection strings, URLs, and secrets.
- [`@shellicar/core-di`](https://github.com/shellicar/core-di) - A basic dependency injection library.

### Reference Architectures

- [`@shellicar/reference-foundation`](https://github.com/shellicar/reference-foundation) - A comprehensive starter repository. Illustrates individual concepts.
- [`@shellicar/reference-enterprise`](https://github.com/shellicar/reference-enterprise) - A comprehensive starter repository. Can be used as the basis for creating a new Azure application workload.

### Build Tools

- [`@shellicar/build-azure-local-settings`](https://github.com/shellicar/build-azure-local-settings) - Build plugin that loads Azure `local.settings.json` with Key Vault reference resolution.
- [`@shellicar/build-clean`](https://github.com/shellicar/build-clean) - Build plugin that automatically cleans unused files from output directories.
- [`@shellicar/build-version`](https://github.com/shellicar/build-version) - Build plugin that calculates and exposes version information through a virtual module import.
- [`@shellicar/build-graphql`](https://github.com/shellicar/build-graphql) - Build plugin that loads GraphQL files and makes them available through a virtual module import.
- [`@shellicar/graphql-codegen-treeshake`](https://github.com/shellicar/graphql-codegen-treeshake) - A graphql-codegen preset that tree-shakes unused types from TypeScript output.

### Framework

- [`@shellicar/svelte-adapter-azure-functions`](https://github.com/shellicar/svelte-adapter-azure-functions) - A [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) that builds your app into an Azure Function.
- [`@shellicar/cosmos-query-builder`](https://github.com/shellicar/cosmos-query-builder) - Helper class for type safe advanced queries for Cosmos DB (Sql Core).
- [`@shellicar/ui-shadcn`](https://github.com/shellicar/ui-shadcn) - Shared Svelte 5 component library built on shadcn-svelte with Tailwind CSS v4 theming.

### Logging & Monitoring

- [`@shellicar/winston-azure-application-insights`](https://github.com/shellicar/winston-azure-application-insights) - An [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights/) transport for [Winston](https://github.com/winstonjs/winston) logging library.
- [`@shellicar/pino-applicationinsights-transport`](https://github.com/shellicar/pino-applicationinsights-transport) - [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights) transport for [pino](https://github.com/pinojs/pino)

<!-- END_ECOSYSTEM -->

## Motivation

Azure Functions automatically loads `local.settings.json` and resolves Key Vault references during local development. Azure App Services and other Node.js apps don't have this capability.

This plugin brings that same behaviour to non-Functions apps, so you can:

- Use the same `local.settings.json` config approach across Functions and App Services
- Commit Key Vault references instead of secrets
- Set up local dev with just Azure CLI access to Key Vault

## Options

See [types.ts](./packages/build-azure-local-settings/src/types.ts) for detailed options documentation.

## Credits

- [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools) - Key Vault reference resolution logic ported from the .NET source
- [esbuild](https://github.com/evanw/esbuild)
- [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault)
