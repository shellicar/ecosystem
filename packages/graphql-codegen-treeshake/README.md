# @shellicar/graphql-codegen-treeshake

> Deprecated: use `preset: 'client'` from `@graphql-codegen/client-preset` instead.

[![npm package](https://img.shields.io/npm/v/@shellicar/graphql-codegen-treeshake.svg)](https://npmjs.com/package/@shellicar/graphql-codegen-treeshake)
[![build status](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml)

## Deprecated

On GraphQL Codegen 6, `@graphql-codegen/client-preset` itself generates only the types your operations and fragments reach, so this preset no longer changes the output. The change is described in [graphql-code-generator#10479](https://github.com/dotansimha/graphql-code-generator/issues/10479).

- **2.0.0** runs on GraphQL Codegen 6 and passes straight through to `@graphql-codegen/client-preset` 6. Its output is identical to `preset: 'client'`. It requires Node 22 or later.
- **1.x** is the last version that filters schema types, and runs on GraphQL Codegen 5.

## Migrating

Replace the preset with `'client'`; `presetConfig` and `config` stay as they are.

```ts
// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/**/*.graphql',
  documents: ['src/**/requests.ts'],
  generates: {
    'src/lib/graphql/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: false,
      },
    },
  },
};

export default config;
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
- [`@shellicar/graphql-codegen-treeshake`](https://github.com/shellicar/ecosystem/tree/main/packages/graphql-codegen-treeshake) - Deprecated: on GraphQL Codegen 6, use `preset: 'client'` from `@graphql-codegen/client-preset` instead.

### Framework

- [`@shellicar/svelte-adapter-azure-functions`](https://github.com/shellicar/ecosystem/tree/main/packages/svelte-adapter-azure-functions) - A [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) that builds your app into an Azure Function.
- [`@shellicar/cosmos-query-builder`](https://github.com/shellicar/ecosystem/tree/main/packages/cosmos-query-builder) - Helper class for type safe advanced queries for Cosmos DB (Sql Core).
- [`@shellicar/ui-shadcn`](https://github.com/shellicar/ui-shadcn) - Shared Svelte 5 component library built on shadcn-svelte with Tailwind CSS v4 theming.

### Logging & Monitoring

- [`@shellicar/winston-azure-application-insights`](https://github.com/shellicar/ecosystem/tree/main/packages/winston-azure-application-insights) - An [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights/) transport for [Winston](https://github.com/winstonjs/winston) logging library.
- [`@shellicar/pino-applicationinsights-transport`](https://github.com/shellicar/pino-applicationinsights-transport) - [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights) transport for [pino](https://github.com/pinojs/pino)

<!-- END_ECOSYSTEM -->
