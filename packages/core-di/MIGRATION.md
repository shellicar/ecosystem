# Migration Guide: v4.x → v5.x

This guide helps you migrate from v4.x to v5.x of `@shellicar/core-di`.

## Overview

v5.x inverts how you declare a registration. In v4 you register the interface and
attach an implementation to it: `register(IFoo).to(Foo)`. In v5 you register the
implementation and declare which interface(s) it satisfies: `register(Foo).as(IFoo)`.
This is the core breaking change, and it is not a rename. It changes what identity
means in the container:

- **Registration is inverted.** `register(...).to(...)` becomes `register(...).as(...)`
  / `.asSelf()`.
- **Implicit singleton sharing is gone.** In v4, two separate `register()` calls
  binding the same concrete class shared one singleton instance, because identity
  was keyed on the concrete class. In v5, identity is declared, not implicit, so two
  `register()` calls are two distinct registrations, and if both are singletons,
  two distinct instances, unless you declare them as the same registration.
- **The builder interfaces are renamed**, and a few types tied to the old
  multi-identifier `register(...)` overload are gone.
- **New capabilities**: `forward()`, `validate()`, `.eager()`, async registration
  (`usingAsync` / `buildProviderAsync`), `printGraph()`, and `IAsyncDisposable`.

Most users will need to rewrite every `register()` call and re-check any code that
relied on two registrations of the same class secretly sharing a singleton.

**Note**: A codemod for the mechanical part of this migration (`register(X).to(Y)` →
`register(Y).as(X)`) may follow in a separate change. This guide does not include one.

## Details

### 1. Identity inversion: `register(...).to(...)` → `register(...).as(...)`

v4's `register()` took one or more *identifiers* and returned a builder whose `.to()`
attached the implementation:

```typescript
// v4
register(IFoo).to(Foo);
register(IFoo, IBar).to(Foo);           // one implementation, two identifiers
register(IFoo).to(Foo, (scope) => new Foo(scope.resolve(IDep)));
register(Foo).to(Foo);                  // "self" registration
```

v5's `register()` takes the *implementation* and returns a builder whose `.as()` /
`.asSelf()` declare identity, `.using()` supplies an optional factory, and a lifetime
verb finishes the chain:

```typescript
// v5
register(Foo).as(IFoo).resolve();
register(Foo).as(IFoo).as(IBar).resolve();
register(Foo).as(IFoo).using((scope) => new Foo(scope.resolve(IDep))).resolve();
register(Foo).asSelf().resolve();
```

Every v4 shape maps onto a v5 shape:

| v4 | v5 |
| --- | --- |
| `register(IFoo).to(Foo)` | `register(Foo).as(IFoo)` |
| `register(IFoo, IBar).to(Foo)` | `register(Foo).as(IFoo).as(IBar)` |
| `register(Foo).to(Foo)` | `register(Foo).asSelf()` |
| `register(IFoo).to(Foo, factory)` | `register(Foo).as(IFoo).using(factory)` |
| `register(IFoo).to(Foo, factory).singleton()` | `register(Foo).as(IFoo).using(factory).singleton()` |
| `.singleton()` / `.scoped()` / `.transient()` | unchanged, but now terminal (returns the built registration, not a further-chainable `ILifetimeBuilder`) |
| *(no default verb was needed; v4 defaulted to* `Lifetime.Resolve` *if no verb called)* | same default, still `Lifetime.Resolve`, still applies if no lifetime verb is called |

Two things do not carry over one-for-one:

- **The factory's identifier parameter is gone.** v4's `.to(implementation, factory)`
  let `implementation` be *any* identifier (not necessarily concrete), because the
  factory did the constructing. v5's `register()` always takes the concrete (or
  abstract) class; the factory is attached separately with `.using()`, and its return
  type is checked against the class you registered.
- **An abstract class can now be registered directly**, something v4 had no direct
  spelling for. `register(AbstractFoo).using(factory).as(IFoo)`: an abstract class
  cannot be built by zero-arg `new`, so the builder for one has no `.asSelf()`, and a
  factory is required, not optional.

### 2. Implicit singleton sharing is gone

In v4, singleton identity was keyed on the *concrete class*, not the registration
call. Two separate `register()` calls binding the same class to two different
interfaces silently shared one instance:

```typescript
// v4: both IFoo and IBar resolve to the SAME Foo instance, implicitly
register(IFoo).to(Foo).singleton();
register(IBar).to(Foo).singleton();
```

In v5, identity is declared, not derived from the class. Each `register()` call
creates its own node in the graph, so the equivalent v5 code produces **two separate
`Foo` instances**:

```typescript
// v5: two DISTINCT Foo instances, one per registration
register(Foo).as(IFoo).singleton();
register(Foo).as(IBar).singleton();
```

If your v4 code relied on the old sharing, for example mutable state on `Foo` visible
through both `IFoo` and `IBar`, or an expectation that constructing `Foo` only happens
once across two registrations, check for it now. It will not fail loudly: you get two
working instances, just not the one shared instance you had before.

**Before upgrading**, search your codebase for any class registered under more than
one v4 `register()` call and decide, for each, whether the sharing was load-bearing.

**To get the same instance under v5**, put all the faces on *one* registration
instead of two:

```typescript
// v5: one registration, two faces, one instance (what v4 gave you implicitly)
register(Foo).as(IFoo).as(IBar).singleton();
```

If the two registrations genuinely need to stay separate call sites (for example,
they come from different modules), redirect one to the other with `forward()`
instead of registering the class twice:

```typescript
// v5: IBar resolves through to whatever IFoo resolves to (same instance)
register(Foo).as(IFoo).singleton();
services.forward(IBar).to(IFoo);
```

### 3. Builder-interface renames

Diffing v4.0.2's `interfaces.ts` against the current `src/interfaces.ts`:

| v4 | v5 | Notes |
| --- | --- | --- |
| `IServiceBuilder<T>` | `INewableServiceBuilder<T, Async, Eager>` / `IAbstractServiceBuilder<T, Async, Eager>` | Split in two: a concrete registration gets `.asSelf()`, an abstract one does not. |
| `ILifetimeBuilder` | *(removed)* | The lifetime verbs (`.singleton()` / `.scoped()` / `.transient()` / `.resolve()`) now live directly on `INewableServiceBuilder` / `IAbstractServiceBuilder` and are terminal: no separate builder type to chain further. |
| `IServiceBuilder.to` (a `ServiceBuilderOptions<T>` callable) | *(removed)* | Replaced by `.as()` / `.asSelf()` + `.using()` on the new builders. |
| *(none)* | `IForwardBuilder<S>` / `IForwardResult` | New. Backs `IServiceCollection.forward()`. |
| `IServiceCollection.register(...identifiers)` (variadic, multi-identifier) | `IServiceCollection.register(implementation)` (single implementation, overloaded on newable vs. abstract) | The old overload accepted one-or-more *identifiers* and inferred `T` via `UnionToIntersection`; the new one takes exactly one implementation. |
| *(none)* | `IServiceCollection.forward(source)` | New. |
| *(none)* | `IServiceCollection.validate()` | New. Static wiring diagnostics without building a provider. |
| *(none)* | `IAsyncServiceCollection` | New. The shape returned by `createServiceCollection({ async: true })`; carries `usingAsync` on its builders and `buildProviderAsync` instead of `buildProvider`. |
| `IServiceProvider` (no `printGraph`, no async dispose) | `IServiceProvider` now also has `printGraph()` and implements `IAsyncDisposable` | New capability, not a rename. |
| `IScopedProvider` (no async dispose) | `IScopedProvider` now implements `IAsyncDisposable` | New capability. |
| *(none)* | `IAsyncDisposable` (`[Symbol.asyncDispose]`) | New. |
| `EnsureObject<T>`, `UnionToIntersection<T>`, `ServiceBuilderOptions<T>`, `CacheKey<T>` (in `types.ts`) | *(removed from `@shellicar/core-di`)* | Existed to support the old variadic `register(...identifiers)` overload; no longer needed with a single-implementation `register()`. |
| `ServiceIdentifier<T>` shape `{ prototype: T; name: string }` | `ServiceIdentifier<T>` now comes from `@shellicar/core-di-engine` | Re-exported for `instanceof` / identity to hold across `core-di` and `core-di-lite`; check your own type annotations if you referenced the old shape directly. |
| `IResolutionScope` (declared in `core-di`) | `IResolutionScope` (declared in `@shellicar/core-di-engine`, re-exported from `core-di`) | Same name, moved package of origin. Only matters if you imported it by path rather than from the `@shellicar/core-di` barrel. |

Also new on the error surface (exported from the barrel, not present in v4):
`BuilderError`, `CaptiveDependencyError`, `CaptivePolicy`, `InvalidOperationError`,
`RuntimeCaptivePolicy`, `ValidationError`, `ValidationProblemKind`. All v4 error
classes (`CircularDependencyError`, `InvalidImplementationError`,
`InvalidServiceIdentifierError`, `MultipleRegistrationError`,
`ScopedSingletonRegistrationError`, `SelfDependencyError`, `ServiceCreationError`,
`ServiceError`, `UnregisteredServiceError`) are unchanged.

## Guide

### Step 1: Update the package

```bash
pnpm add @shellicar/core-di@^5
```

### Step 2: Find every `register()` call

Every `register(...).to(...)` call needs rewriting. Grep for `.to(` in files that
import from `@shellicar/core-di` to find them all. There is no partial-migration
path, since the old `register()` overload no longer exists.

### Step 3: Invert identifier and implementation

For each call, move the implementation into `register()` and the old identifier(s)
into `.as()` (or drop them and use `.asSelf()` if you registered a class against
itself):

```typescript
// Before
register(IFoo).to(Foo);

// After
register(Foo).as(IFoo);
```

```typescript
// Before
register(IFoo, IBar).to(Foo);

// After
register(Foo).as(IFoo).as(IBar);
```

```typescript
// Before
register(Foo).to(Foo);

// After
register(Foo).asSelf();
```

### Step 4: Move factories to `.using()`

```typescript
// Before
register(IFoo).to(Foo, (scope) => new Foo(scope.resolve(IDep)));

// After
register(Foo).as(IFoo).using((scope) => new Foo(scope.resolve(IDep)));
```

If your factory's dependencies are static, prefer the declared-deps form: it makes
the dependencies visible to `validate()` and `printGraph()`:

```typescript
register(Foo).as(IFoo).using([IDep], (dep) => new Foo(dep));
```

### Step 5: Check for classes registered more than once

For every concrete class you `register()` under more than one v4 call, decide
whether the old implicit singleton sharing was load-bearing (see [Details → 2](#2-implicit-singleton-sharing-is-gone)).
Consolidate onto one registration with multiple `.as()` faces, or use `forward()` if
the two need to stay declared separately.

### Step 6: Update any code that imported the old builder types

`IServiceBuilder`, `ILifetimeBuilder`, and the old `register(...identifiers)`
overload's supporting types (`EnsureObject`, `UnionToIntersection`,
`ServiceBuilderOptions`) are gone. Replace `IServiceBuilder<T>` references with
`INewableServiceBuilder<T>` or `IAbstractServiceBuilder<T>` as appropriate.

### Step 7: Test and verify

```bash
# Check for TypeScript errors
tsc --noEmit

# Run your test suite: pay particular attention to any test that
# depends on two registrations sharing a singleton
```

Optionally, add `services.validate()` to a CI step: it reports unregistered
identifiers, cycles, and captive dependencies statically, without constructing a
provider.

## Comparison

### Before (v4.x)

```typescript
import { createServiceCollection, Lifetime } from '@shellicar/core-di';

abstract class ILogger {
  abstract log(message: string): void;
}

abstract class ICache {
  abstract get(key: string): unknown;
}

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(message);
  }
}

class MemoryCache implements ICache {
  get(key: string): unknown {
    return undefined;
  }
}

class App {
  constructor(
    public readonly logger: ILogger,
    public readonly cache: ICache,
  ) {}
}

const services = createServiceCollection();

services.register(ILogger).to(ConsoleLogger).singleton();
services.register(ICache).to(MemoryCache).singleton();
services.register(App).to(App, (scope) => new App(scope.resolve(ILogger), scope.resolve(ICache)));

const provider = services.buildProvider();
const app = provider.resolve(App);
```

### After (v5.x)

```typescript
import { createServiceCollection, Lifetime } from '@shellicar/core-di';

abstract class ILogger {
  abstract log(message: string): void;
}

abstract class ICache {
  abstract get(key: string): unknown;
}

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(message);
  }
}

class MemoryCache implements ICache {
  get(key: string): unknown {
    return undefined;
  }
}

class App {
  constructor(
    public readonly logger: ILogger,
    public readonly cache: ICache,
  ) {}
}

const services = createServiceCollection();

services.register(ConsoleLogger).as(ILogger).singleton();
services.register(MemoryCache).as(ICache).singleton();
services.register(App).asSelf().using([ILogger, ICache], (logger, cache) => new App(logger, cache));

const provider = services.buildProvider();
const app = provider.resolve(App);
```

## Migration Checklist

- [ ] Update package version to v5.x
- [ ] Find every `register()` call in the codebase
- [ ] Invert each call: implementation into `register()`, old identifier(s) into `.as()` / `.asSelf()`
- [ ] Move any `.to(impl, factory)` factory into `.using()`
- [ ] Check every class registered under more than one v4 call for reliance on implicit singleton sharing; consolidate faces or use `forward()`
- [ ] Replace any direct references to `IServiceBuilder` / `ILifetimeBuilder` with `INewableServiceBuilder` / `IAbstractServiceBuilder`
- [ ] Run `tsc --noEmit` and the test suite
- [ ] Consider adding `services.validate()` to CI

## Troubleshooting

### TypeScript Errors

**Error**: `Property 'to' does not exist on type 'INewableServiceBuilder<...>'`\
**Solution**: You're still calling the v4 shape. Invert to `register(Impl).as(Identifier)`.

**Error**: `Argument of type 'typeof Foo' is not assignable to parameter of type 'AbstractNewable<...>'`\
**Solution**: You passed a concrete class where the abstract overload was expected, or
vice versa. Check whether you meant `register()`'s newable or abstract overload.

**Error**: `Property 'asSelf' does not exist on type 'IAbstractServiceBuilder<...>'`\
**Solution**: `asSelf()` only exists on the newable builder. An abstract class
cannot be constructed by zero-arg `new`, so it must be registered via `.as()` with a
`.using()` factory.

**Error**: `Property 'register' does not exist` / overload mismatch on `register(A, B)`\
**Solution**: The variadic multi-identifier `register(...)` overload is gone. Register
the implementation once and chain `.as()` per face: `register(Foo).as(A).as(B)`.

### Runtime / Behavioural

**Symptom**: Two interfaces that used to resolve to the same singleton instance now
resolve to two different instances, and shared mutable state between them has
disappeared.\
**Solution**: This is the identity-inversion break (see [Details → 2](#2-implicit-singleton-sharing-is-gone)).
Put both faces on one `register()` call (`register(Foo).as(IFoo).as(IBar)`), or
`forward()` one identifier to the other.

**Error**: `InvalidOperationError` mentioning a lifetime already set\
**Solution**: A lifetime verb was called twice on the same builder chain. In v5 the
verb is terminal, unlike v4 where `ILifetimeBuilder` allowed further chaining.

**Error**: `ScopedSingletonRegistrationError`\
**Solution**: Unchanged from v4. You called `.singleton()` on a scoped collection.
