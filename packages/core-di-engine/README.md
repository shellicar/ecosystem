# @shellicar/core-di-engine

> The composable engine that `@shellicar/core-di` and `@shellicar/core-di-lite` build from

[![npm package](https://img.shields.io/npm/v/@shellicar/core-di-engine.svg)](https://npmjs.com/package/@shellicar/core-di-engine)
[![build status](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/shellicar/ecosystem/actions/workflows/ci.yml)

## What it is

`core-di-engine` builds a static dependency graph from a set of registrations and
resolves instances from it. It has no lifetimes of its own, no scopes, no `validate()`
method and no opinion about what a "preset" should look like — those are all things a
consumer composes from the pieces this package exports. `@shellicar/core-di` composes a
full-featured collection (singleton/scoped/resolve lifetimes, async factories, scopes,
disposal, captive-dependency validation) from it. `@shellicar/core-di-lite` composes a
singleton-only collection from the same engine.

You can use it the way core-di and core-di-lite do: build your own registration surface
and your own `validate()` out of the primitives below. This README is for that reader.

## Why a separate package

Before this package existed, core-di and core-di-lite each carried their own copy of the
structural machinery — the graph, the plan builder, the resolution algorithm — and lite
diverged from full core-di's behaviour in small, accidental ways. `core-di-engine` is the
seam: both packages compose from one engine, so the DAG-building and resolution logic is
identical between them, byte for byte, and the only difference between "full" and "lite"
is which lifetime features, which strategy, and which policies a preset wires in.

This is not a stable public API in the sense of "avoid breaking it lightly" — it changes
in lockstep with core-di and core-di-lite, which are its only intended composers — but it
is fully exported and usable on its own if you want a third preset they don't offer.

## Installation

```sh
npm i --save @shellicar/core-di-engine
```

```sh
pnpm add @shellicar/core-di-engine
```

## The composable model

A preset is four decisions, each a function or a small object you hand to `buildEngine`:

1. **Which lifetimes are cached, and how.** A *lifetime feature* is a `getInstance(key, env, build)` cache. The engine ships three: `createSingletonLifetime()` (one instance for the life of the engine), `createScopedLifetime()` (one instance per `createScope()`, and the presence of `beginScope` on a feature is what makes `createScope()` exist at all), `createResolveLifetime()` (one instance per top-level `resolve()` call). There is no transient feature — a token with no feature for its lifetime is never cached, which is what makes transient the floor: omit a feature and its lifetime becomes "construct every time".
2. **A default lifetime**, for any registration that never calls a lifetime verb.
3. **A resolution strategy.** `createPlanStrategy()` compiles a graph into a plan once and replays it on every resolve; `createNaiveStrategy()` walks dependencies recursively with no plan or graph machinery, trading replay speed for a smaller bundle. The engine itself never imports either — a composition supplies its own, so a preset that only needs the naive strategy never pulls in the plan/graph code.
4. **Optionally, disposal.** `createDisposal()` tracks anything with `Symbol.dispose` or `Symbol.asyncDispose` returned during construction, keyed to the boundary that constructed it (root or a scope), and tears it down nearest-boundary-first when that boundary ends.

### Building a collection and an engine

```ts
import '@shellicar/core-di-engine/polyfill';
import { Lifetime, createCollection, createSingletonLifetime, createResolveLifetime, createNaiveStrategy, buildEngine } from '@shellicar/core-di-engine';

// createCollection gives you the register().as()/.asSelf()/.using()/.eager() builder,
// with one lifetime verb per lifetime you pass in.
const composed = createCollection([Lifetime.Singleton, Lifetime.Resolve]);

abstract class IClock {
  abstract now(): Date;
}
class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}

composed.register(SystemClock).as(IClock).singleton();

// buildEngine takes the raw registration map, a composition of the pieces above, and
// build options.
const engine = buildEngine(composed.regs, {
  features: {
    [Lifetime.Singleton]: createSingletonLifetime(),
    [Lifetime.Resolve]: createResolveLifetime(),
  },
  defaultLifetime: Lifetime.Resolve,
  strategy: createNaiveStrategy(),
});

const clock = engine.resolve(IClock);
```

This is, in miniature, what `core-di-lite`'s `createServiceCollection` does: it composes
`Lifetime.Singleton` only, sets `defaultLifetime: Lifetime.Singleton`, sets
`prebakeSingletons: true` (construct every singleton at `buildEngine`, so a resolve after
build is a pure lookup), and uses `createNaiveStrategy()` because prebaking means nothing
is ever built lazily, so the plan strategy's replay speed buys nothing. `core-di` composes
all three lifetime features, `defaultLifetime: Lifetime.Resolve`, `createPlanStrategy()`,
and a `disposal` sink.

### Scopes

A composition that includes a feature with `beginScope` (only `createScopedLifetime()`
has one) gets `createScope()` on its engine:

```ts
import { Lifetime, createCollection, createSingletonLifetime, createScopedLifetime, createPlanStrategy, buildEngine } from '@shellicar/core-di-engine';

const composed = createCollection([Lifetime.Singleton, Lifetime.Scoped]);
abstract class IContext {}
class RequestContext implements IContext {}
composed.register(RequestContext).as(IContext).scoped();

const engine = buildEngine(composed.regs, {
  features: {
    [Lifetime.Singleton]: createSingletonLifetime(),
    [Lifetime.Scoped]: createScopedLifetime(),
  },
  strategy: createPlanStrategy(),
});

const scope = engine.createScope();
const ctx = scope.resolve(IContext);
scope[Symbol.dispose]();
```

A collection built without a scoped feature has no `createScope` at all — `EngineFor<C>`
only types it in when `Lifetime.Scoped` is a key of `C['features']`, matching lite's
surface, which genuinely has no `createScope`.

### Async at the build boundary

`buildEngineAsync` and a registration's `usingAsync` exist for the same reason: an async
factory can only be honoured while the engine is being built. A composed singleton with
an async factory is awaited during `buildEngineAsync` (or, unprebaked, at first async
resolve during build if it's a prebake candidate); reaching one from a synchronous
`buildEngine`, or from any non-singleton lifetime, throws — that combination is dead
wiring the engine refuses to run silently.

```ts
import { Lifetime, createCollection, createSingletonLifetime, createPlanStrategy, buildEngineAsync } from '@shellicar/core-di-engine';

const composed = createCollection([Lifetime.Singleton], { async: true });
abstract class IConnection {}
class Connection implements IConnection {
  constructor(private readonly dsn: string) {}
}
composed.register(Connection).usingAsync(async () => new Connection('postgres://localhost')).as(IConnection).singleton();

const engine = await buildEngineAsync(composed.regs, {
  features: { [Lifetime.Singleton]: createSingletonLifetime() },
  strategy: createPlanStrategy(),
});
```

### `.eager()`

Every builder carries `.eager()`, chainable in any order with the lifetime verbs. It only
has an effect on a singleton: an eager singleton is constructed during `buildEngine`
(alongside anything prebaked) instead of lazily at first resolve. On any other lifetime
it's a no-op, because only the singleton table exists at build time to construct into.

### Graph policies and validation

The engine has no `validate()` — that's a decision a preset makes about which problems
it cares about and how to report them. What it exports is the graph derivation and a set
of named policy functions a consumer runs over it:

```ts
import { deriveFacts, runGraphPolicies, missingTargetPolicy, cyclePolicy, disposalCaptive, Lifetime } from '@shellicar/core-di-engine';

const graph = deriveFacts(composed.regs);
const problems = runGraphPolicies(graph, [
  missingTargetPolicy, // a dependency or forward target that was never registered
  cyclePolicy, // a dependency cycle, reported differently depending on whether it's shadowed by a later duplicate registration
  disposalCaptive(Lifetime.Resolve), // a singleton statically reaching a scoped dependency (the MS-DI-style captive rule)
]);
```

`strictCaptive(defaultLifetime)` is the stricter captive policy (reports transient and
un-verbed reach too, not just scoped), and `captivePolicyFor(CaptivePolicy, defaultLifetime)`
picks between `strictCaptive`, `disposalCaptive` and a no-op policy from the
`CaptivePolicy` enum, matching how `core-di`'s `ServiceCollectionOptions.captivePolicy`
selects one. `asyncThroughSyncPathPolicy` reports an async factory registered on a
non-singleton lifetime — the same condition `buildEngine` refuses at runtime, surfaced
statically instead. This is exactly how `core-di`'s and `core-di-lite`'s own `validate()`
methods are built: run `deriveFacts`, hand the graph and a chosen list of policies to
`runGraphPolicies`, and fold in identifiers with no declared face (`createCollection`'s
`unfaced()`) separately.

`CaptivePolicy` governs what `validate()` reports; `RuntimeCaptivePolicy` is the runtime
counterpart — pass `runtimeCaptivePolicy: RuntimeCaptivePolicy.Throw` in the composition
and `resolve()` throws `CaptiveDependencyError` the moment a singleton under construction
pulls a scoped instance through a factory the static graph couldn't see. It defaults to
`RuntimeCaptivePolicy.None`, so nothing is enforced at resolve unless asked for.

### Disposal

Pass `disposal: createDisposal()` in the composition and any instance built with
`Symbol.dispose` or `Symbol.asyncDispose` is tracked against the boundary that resolved
it — root for a singleton, the scope for a scoped instance, whichever boundary was live
for a resolve/transient instance — and torn down nearest-boundary-first when that
boundary's `[Symbol.dispose]()` or `[Symbol.asyncDispose]()` runs. A synchronous dispose
of a boundary holding an async-only disposable throws; use `await using` (asyncDispose)
for a boundary that might hold one.

### Inspecting the graph and timing resolves

`printGraph(write?)` is on every `Scope`/`Engine`; it writes a human-readable rendering
of the static graph (via the composed strategy's own `graphLines`) to any line sink,
`console.log` by default, without constructing anything.

The engine itself has no instrumentation hook — no timing type, no `onTiming` callback,
nothing in this package's exports measures a build or a resolve. `core-di`'s
`buildProvider({ instrument })` option is a wrapper it applies around calls into the
engine, not a feature the engine composes. A preset that wants timing has to add it the
way core-di does: measure around the calls it makes into `buildEngine`/`resolve`.

### Errors

`UnregisteredServiceError`, `MultipleRegistrationError`, `CircularDependencyError`,
`CaptiveDependencyError`, `ServiceCreationError`, `ValidationError`,
`ScopedSingletonRegistrationError`, `InvalidServiceIdentifierError`,
`InvalidImplementationError`, `SelfDependencyError` and `InvalidOperationError` are all
exported, along with the `ServiceError`/`BuilderError` abstract base classes they extend.
Both core-di and core-di-lite re-export these directly, so `instanceof` checks are
compatible across a codebase that uses both.

### Forwarding

`ForwardBuilder` backs `forward(source).to(target)`: resolving `source` resolves
whatever `target` resolves to, with no lifetime of its own (a forward can't be built —
there's no lifetime verb on `IForwardResult`).

```ts
import { ForwardBuilder, pushBucket } from '@shellicar/core-di-engine';

abstract class IAlias {}
new ForwardBuilder(IAlias, (identifier, descriptor) => pushBucket(composed.regs, identifier, descriptor)).to(SystemClock);
```

### `@dependsOn`

The property-injection decorator, identical between presets: it records the dependency
against the class at class-definition time (so a static graph can see it before anything
is constructed), independent of which lifetimes or strategy a preset composes.

```ts
import { dependsOn } from '@shellicar/core-di-engine';

class Greeter {
  @dependsOn(IClock) private readonly clock!: IClock;
}
```

## Usage note: the polyfill

`import '@shellicar/core-di-engine/polyfill'` installs `Symbol.metadata` if the runtime
doesn't already have it (needed for `@dependsOn`'s field metadata). Both core-di and
core-di-lite import it once, at their own entry point; if you're composing a preset of
your own directly against this package, import it the same way, once, before any class
using `@dependsOn` is defined.
