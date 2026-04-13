# @shellicar/ecosystem

Everything related to the @shellicar packages.

## @shellicar TypeScript Ecosystem

### Core Libraries

- [`@shellicar/core-config`](packages/core-config/) - A library for securely handling sensitive configuration values like connection strings, URLs, and secrets.
- [`@shellicar/core-di`](packages/core-di/) - A basic dependency injection library.

### Build Tools

- [`@shellicar/build-azure-local-settings`](packages/build-azure-local-settings/) - Build plugin that loads Azure local.settings.json with Key Vault reference resolution for non-Azure-Functions apps.
- [`@shellicar/build-clean`](packages/build-clean/) - Build plugin that automatically cleans unused files from output directories.
- [`@shellicar/build-graphql`](packages/build-graphql/) - Build plugin that loads GraphQL files and makes them available through a virtual module import.
- [`@shellicar/build-version`](packages/build-version/) - Build plugin that calculates and exposes version information through a virtual module import.
- [`@shellicar/graphql-codegen-treeshake`](packages/graphql-codegen-treeshake/) - A graphql-codegen preset that tree-shakes unused types from TypeScript output.

### Framework

- [`@shellicar/svelte-adapter-azure-functions`](packages/svelte-adapter-azure-functions/) - A [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) that builds your app into an Azure Function.
- [`@shellicar/cosmos-query-builder`](packages/cosmos-query-builder/) - Helper class for type safe advanced queries for Cosmos DB (Sql Core).

### Logging & Monitoring

- [`@shellicar/winston-azure-application-insights`](packages/winston-azure-application-insights/) - An [Azure Application Insights](https://azure.microsoft.com/en-us/services/application-insights/) transport for [Winston](https://github.com/winstonjs/winston) logging library.
