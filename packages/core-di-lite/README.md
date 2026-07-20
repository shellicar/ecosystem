# @shellicar/core-di-lite

> A stripped-down dependency injection container for CLI use cases

[![npm package](https://img.shields.io/npm/v/@shellicar/core-di-lite.svg)](https://npmjs.com/package/@shellicar/core-di-lite)
[![build status](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml)

## What it is

`core-di-lite` is `@shellicar/core-di`'s registration grammar over a single lifetime:
everything is a singleton, everything is constructed up front at `buildProvider()`, and
a `resolve()` after that is a pure lookup — no lazy construction, no per-call caching to
check. It composes from the same shared engine as core-di
(`@shellicar/core-di-engine`), so its errors, its `@dependsOn` decorator, and its
registration behaviour are identical to core-di's wherever lite's surface overlaps with
it. What it doesn't have is scopes or a choice of lifetime: there is no `createScope`,
no `.scoped()`, no `.resolve()` (the per-call lifetime verb), and no `defaultLifetime`
to pick — every registration is a singleton whether you call `.singleton()` or not.

Reach for it when you don't need per-request or per-call lifetimes — a CLI tool, a
script, a small service with no request boundary — and want the registration ergonomics
of core-di without carrying scope machinery you'll never use.

## Features

* 🎯 Type-safe registration and resolution
* 🏭 Factory method support
* 🎨 Decorator-based property injection (`@dependsOn`)
* 🔒 Singleton-only: everything is constructed once, at `buildProvider()`
* 🚨 Fails fast: a wiring or construction error throws at `buildProvider()`, not at some later resolve
* 🔍 `validate()` reads the static graph (missing registrations, cycles) with no construction, for CI
* 🧩 Errors and `@dependsOn` are the same objects core-di uses — `instanceof` checks are compatible across both

## Installation

```sh
npm i --save @shellicar/core-di-lite
```

```sh
pnpm add @shellicar/core-di-lite
```

```ts
import { createServiceCollection } from '@shellicar/core-di-lite';

abstract class IGreeter {
  abstract greet(): string;
}
class Greeter implements IGreeter {
  greet(): string {
    return 'hello';
  }
}

const services = createServiceCollection();
services.register(Greeter).as(IGreeter);
const provider = services.buildProvider();
const greeter = provider.resolve(IGreeter);
```

## How it differs from `@shellicar/core-di`

* **No scopes.** `IServiceProvider` here is `Pick<IResolutionScope, 'resolve' | 'resolveAll'>` — there is no `createScope`, so there's nothing to open or dispose per request.
* **Singleton is the only lifetime, and the default.** `.singleton()` is the only lifetime verb on the builder, and it's optional: a registration with no lifetime verb at all is still a singleton, because lite's engine composition sets `defaultLifetime: Lifetime.Singleton` (core-di's default is `Lifetime.Resolve`, not singleton — omitting a lifetime verb means something different in each package).
* **Everything is prebaked.** `buildProvider()` constructs every registration, in dependency order, before returning. If a constructor throws or a dependency is missing, it throws there — not on the first `resolve()` a caller happens to make. This trades laziness for "the process either starts successfully or doesn't start at all", which is usually what you want for a CLI or a short-lived process.
* **No async factories.** There's no `usingAsync` and no `buildProviderAsync`. Everything is synchronous.
* **No `overrideLifetime` and no captive-dependency reporting.** Every registration is already a singleton, so there's no shorter-lived dependency a singleton could capture, and nothing to override.

Everything else — `register().as()/.asSelf()/.using()`, `forward().to()`, multiple
registrations resolved with `resolveAll`, the `@dependsOn` decorator, and the error
types — is the same grammar and the same objects as core-di.

## Motivation

I had a CLI tool and wanted a stripped-down, simpler DI library that validates everything
at startup. `core-di` is intentionally not fail-fast at build — for a CLI, that's the
opposite of what I wanted.

## Feature Examples

* Type-safe registration and resolution, same as core-di.

```ts
const services = createServiceCollection();
abstract class IAbstract { abstract method(): void; }
class Concrete {}
services.register(Concrete).as(IAbstract);
//                              ^ Error: Concrete does not implement IAbstract
```

* Provide a factory method for instantiating a class.

```ts
services
  .register(Redis)
  .using((scope) => {
    const options = scope.resolve(IRedisOptions);
    return new Redis({ port: options.port, host: options.host });
  })
  .asSelf();
```

* Provide dependencies declaratively instead, and let `using` resolve them.

```ts
services.register(Redis).using([IRedisOptions], (options) => new Redis({ port: options.port, host: options.host })).asSelf();
```

* Declare dependencies with `@dependsOn` on a class field, same as core-di.

```ts
import { dependsOn } from '@shellicar/core-di-lite';

abstract class IClock {
  abstract now(): Date;
}
class Greeter {
  @dependsOn(IClock) private readonly clock!: IClock;
}
```

* Multiple faces share one instance: every identifier declared from the same `register()` call resolves to the same singleton.

```ts
services.register(Concrete).as(IAbstract1).as(IAbstract2);
const provider = services.buildProvider();
provider.resolve(IAbstract1) === provider.resolve(IAbstract2); // true
```

* Multiple registrations for one identifier: `resolve()` throws for the ambiguity, `resolveAll()` returns every instance.

```ts
services.register(HandlerA).as(IHandler);
services.register(HandlerB).as(IHandler);
const provider = services.buildProvider();
const handlers = provider.resolveAll(IHandler); // [HandlerA instance, HandlerB instance]
```

* Forward one identifier to another registration.

```ts
abstract class ILegacyName {}
services.forward(ILegacyName).to(IGreeter);
```

* Validate the wiring statically before building. `validate()` reads the graph (missing registrations, cycles) with no construction and returns a report without throwing.

```ts
const report = services.validate();
if (!report.valid) {
  for (const problem of report.problems) {
    console.warn(problem.kind, problem.message);
  }
}
```

## Usage

```ts
import { createServiceCollection, dependsOn } from '@shellicar/core-di-lite';

abstract class IClock {
  abstract now(): Date;
}
class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}

abstract class IGreeter {
  abstract greet(): string;
}
class Greeter implements IGreeter {
  @dependsOn(IClock) private readonly clock!: IClock;

  greet(): string {
    return `The time is: ${this.clock.now().toISOString()}`;
  }
}

const services = createServiceCollection();
services.register(SystemClock).as(IClock);
services.register(Greeter).as(IGreeter);

// Every registration above is constructed here, in dependency order.
const provider = services.buildProvider();

console.log(provider.resolve(IGreeter).greet());
```
