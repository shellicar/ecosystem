# @shellicar/core-di

> A basic dependency injection library for TypeScript

[![npm package](https://img.shields.io/npm/v/@shellicar/core-di.svg)](https://npmjs.com/package/@shellicar/core-di)
[![build status](https://github.com/shellicar/core-di/actions/workflows/node.js.yml/badge.svg)](https://github.com/shellicar/core-di/actions/workflows/node.js.yml)

## Features

* 🎯 Type-safe registration and resolution
* 🏭 Factory method support
* 🎨 Decorator-based property injection
* 🔄 Flexible lifetime management
* 📦 Service modules for organization
* 🔍 Circular dependency detection at resolution time
* 🚨 Clear error messages with dependency chain tracking

## Installation & Quick Start

```sh
npm i --save @shellicar/core-di
```

```sh
pnpm add @shellicar/core-di
```

```ts
import { createServiceCollection } from '@shellicar/core-di';
abstract class IAbstract {}
class Concrete implements IAbstract {}
const services = createServiceCollection();
services.register(IAbstract).to(Concrete);
const provider = services.buildProvider();
const svc = provider.resolve(IAbstract);
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

Coming from .NET I am used to DI frameworks/libraries such as `Autofac`, `Ninject`, `StructureMap`, `Unity`, and Microsoft's own `DependencyInjection`.

I started using `InversifyJS`, and tried out some others along the way, such as `diod`.

With TypeScript 5.0 generally available with non-experimental decorators, most DI libraries have not been updated, so I decided to create my own.

## Feature Examples

My set of features is simple, based on my current usage

See [readme examples](./examples/readme/src) for example source code.

* Type-safe registration.

```ts
const services = createServiceCollection();
abstract class IAbstract { abstract method(): void; }
abstract class Concrete {}
services.register(IAbstract).to(Concrete);
//                              ^ Error
```

* Type-safe resolution.

```ts
const provider = services.buildProvider();
const svc = provider.resolve(IMyService);
//    ^ IMyService
```

* Provide factory methods for instantiating classes.

```ts
services.register(Redis).to(Redis, x => {
  const options = x.resolve(IRedisOptions);
  return new Redis({
    port: options.port,
    host: options.host,
  });
});
```

* Use property injection with decorators for simple dependency definition.

```ts
abstract class IDependency {}
class Service implements IService {
  @dependsOn(IDependency) private readonly dependency!: IDependency;
}
```

* Provide multiple implementations for identifiers and provide a `resolveAll` method.
* Define instance lifetime with simple builder pattern.

```ts
services.register(IAbstract).to(Concrete).singleton();
```

* Create scopes to allow "per-request" lifetimes.

```ts
const services = createServiceCollection();
const provider = services.buildProvider();
using scope = provider.createScope();
```

* Register classes during a scope

```ts
using scope = provider.createScope();
scope.Services.register(IContext).to(Context);
```

* Multiple registrations

```ts
services.register(IAbstract1, IAbstract2).to(Concrete).singleton();
const provider = services.buildProvider();
provider.resolve(IAbstract1) === provider.resolve(IAbstract2);
```

* Override registrations (e.g.: for testing)

```ts
import { ok } from 'node:assert/strict';
const services = createServiceCollection({ registrationMode: ResolveMultipleMode.LastRegistered });
services.register(IOptions).to(Options);
// Later
services.register(IOptions).to(MockOptions);
const provider = services.buildProvider();
const options = provider.resolve(IOptions);
ok(options instanceof MockOptions);
```

* Override lifetimes (e.g.: for testing)

```ts
const services = createServiceCollection({ logLevel: LogLevel.Debug });
services.register(IAbstract).to(Concrete).singleton();
const provider = services.buildProvider();
provider.Services.overrideLifetime(IAbstract, Lifetime.Transient);
provider.resolve(IAbstract) !== provider.resolve(IAbstract);
```

* Logging options

```ts
class CustomLogger extends ILogger {
  public override debug(message?: any, ...optionalParams: any[]): void {
    // custom implementation  
  }
}
// Override default logger
const services1 = createServiceCollection({ logger: new CustomLogger() });
// Override default log level
const services2 = createServiceCollection({ logLevel: LogLevel.Debug });
```

* Service modules

```ts
class IAbstract {}
class Concrete extends IAbstract {}

class MyModule implements IServiceModule {
  public registerServices(services: IServiceCollection): void {
    services.register(IAbstract).to(Concrete);
  }
}

const services = createServiceCollection();
services.registerModules(MyModule);
const provider = services.buildProvider();
const svc = provider.resolve(IAbstract);
```

## Usage

Check the test files for different usage scenarios.

```ts
import { dependsOn, createServiceCollection, IServiceModule, type IServiceCollection } from '@shellicar/core-di';

// Define the dependency interface
abstract class IClock {
  abstract now(): Date;
}
// And implementation
class DefaultClock implements IClock {
  now(): Date {
    return new Date();
  }
}

// Define your interface
abstract class IDatePrinter {
  abstract handle(): string;
}
// And implementation
class DatePrinter implements IDatePrinter {
  @dependsOn(IClock) public readonly clock!: IClock;

  handle(): string {
    return `The time is: ${this.clock.now().toISOString()}`;
  }  
}

class TimeModule extends IServiceModule {
  public registerServices(services: IServiceCollection): void {
    services.register(IClock).to(DefaultClock).singleton();
    services.register(IDatePrinter).to(DatePrinter).scoped();
  }
}

// Register and build provider
const services = createServiceCollection();
services.registerModules([TimeModule]);
const sp = services.buildProvider();

// Optionally create a scope
using scope = sp.createScope();

// Resolve the interface
const svc = scope.resolve(IDatePrinter);
console.log(svc.handle());
```

## Credits & Inspiration

* [InversifyJS](https://github.com/inversify/InversifyJS)
* [Microsoft.Extensions.DependencyInjection](https://github.com/dotnet/runtime/tree/main/src/libraries/Microsoft.Extensions.DependencyInjection)
