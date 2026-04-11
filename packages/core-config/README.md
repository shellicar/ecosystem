# @shellicar/core-config

> A library for securely handling sensitive configuration values like connection strings, URLs, and secrets.

[![npm package](https://img.shields.io/npm/v/@shellicar/core-config.svg)](https://npmjs.com/package/@shellicar/core-config)
[![build status](https://github.com/shellicar/core-config/actions/workflows/node.js.yml/badge.svg)](https://github.com/shellicar/core-config/actions/workflows/node.js.yml)

## Features

- 🔐 **SecureString** - Safely handle sensitive string values with automatic hashing for logs and serialisation
- 🔗 **SecureConnectionString** - Parse and protect connection strings with configurable secret key detection
- 🌐 **SecureURL** - Handle URLs while protecting sensitive components like passwords

## Installation & Quick Start

```sh
npm i --save @shellicar/core-config
```

```sh
pnpm add @shellicar/core-config
```

```ts
import { createFactory } from '@shellicar/core-config';

const factory = createFactory();

console.log(factory.string('myPassword123'));
console.log(factory.connectionString('Server=myserver.uri;Password=myPassword123'));
console.log(factory.url(new URL('http://myuser:myPassword123@myserver.uri')));
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

## Motivation

To make storing and comparing configuration including secrets easy and simple.

You can easily output or display your configuration, even secret/secure values, without having to manually hash them or extract them.

## Feature Examples

Three main classes, `SecureString`, `SecureConnectionString`, and `SecureURL`.

See [readme examples](./examples/readme/src) for example source code.

- Handle strings.

```typescript
import { createFactory } from '@shellicar/core-config';

const factory = createFactory();
const secret = factory.string('myPassword123');

console.log(secret.toString()); 
// sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716

console.log(JSON.stringify({ secret }));
// {"secret":"sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716"}
```

- Handle connection strings (`Key=Value[;Key=Value...]`).

```typescript
import { createFactory } from '@shellicar/core-config';

const factory = createFactory();
const conn = factory.connectionString('Server=myserver;Password=myPassword123');
console.log(conn.toString());
// Server=myserver;Password=sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716

// Custom secret keys
console.log(factory.connectionString('Server=myserver;SuperSecretKey=myPassword123', ['SuperSecretKey']));
// {
//   Server: 'myserver',
//   SuperSecretKey: 'sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716'
// }
```

- Handle URLs with passwords.information:

```typescript
import { createFactory } from '@shellicar/core-config';

const factory = createFactory();
const url = new URL('https://user:myPassword123@example.com?key=value');
const secureUrl = factory.url(url);

console.log(secureUrl.toString());
// https://user:sha256%3A71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716@example.com/?key=value

console.log(secureUrl);
// {
//   href: 'https://user@example.com/',
//   password: 'sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716',
//   searchParams: { key: 'value' }
// }
```

- Use HMAC.

```ts
import { createFactory } from '@shellicar/core-config';

const factory = createFactory({ secret: 'mySecret' });
const secret = factory.string('myPassword123');

console.log(secret.toString()); 
// sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716

console.log(JSON.stringify({ secret }));
// {"secret":"sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716"}
```

### Default Secure Keys

For a list of default secure keys for connection strings, see [defaults.ts](./packages/core-config/src/defaults.ts).

### Secure Output

All secure types implement proper toString(), toJSON(), and inspect() methods to ensure sensitive data is never accidentally exposed through logs or serialisation.

### Real World Example

Using with Zod for environment variable validation:

```typescript
import { env } from 'node:process';
import { createFactory } from '@shellicar/core-config';
import { z } from 'zod';

const factory = createFactory();

const envSchema = z.object({
  // MongoDB connection string with username/password
  MONGODB_URL: z.url().transform((x) => factory.url(new URL(x))),

  // API key for external service
  API_KEY: z
    .string()
    .min(1)
    .transform((x) => factory.string(x)),

  // SQL Server connection string
  SQL_CONNECTION: z.string().transform((x) => factory.connectionString(x)),
});

// Parse environment variables
const config = envSchema.parse(env);

// Values are now strongly typed and secured
console.log(config.MONGODB_URL.toString());
// mongodb://myuser:sha256%3A...@mongodb.example.com/

console.log(config.API_KEY.toString());
// sha256:...

console.log(config.SQL_CONNECTION.toString());
// Server=myserver;Database=mydb;User Id=admin;Password=sha256:...
```

All sensitive values are automatically hashed in logs and serialisation, while still being accessible via the `secretValue` property when needed.
