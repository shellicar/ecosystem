import type { Engine, Scope, ServiceIdentifier, SourceType } from '@shellicar/core-di-engine';
import { IResolutionScope, ScopeMismatchError } from '@shellicar/core-di-engine';
import { IScopedProvider, IServiceProvider } from '../interfaces';
import type { ILogger } from '../logger';
import type { InstrumentationHook } from '../types';
import type { ScopeServicesSource, ServicesSource } from './types';

// The root provider: Services carries no .shadow(), matching the root collection it
// holds. ScopedServiceProvider (below) fixes the generic to ScopeServicesSource, born
// whenever createScope() opens a scope (the root's own or a nested one) — the narrowing
// flows through the constructor's own parameter type, not a re-declared field.
export class ServiceProvider<S extends ServicesSource = ServicesSource> implements IServiceProvider {
  protected constructor(
    protected readonly logger: ILogger,
    public readonly Services: S,
    protected readonly scope: Scope,
    protected readonly engine: Engine,
    protected readonly rootProvider: ServiceProvider | undefined,
    protected readonly instrument: InstrumentationHook | undefined,
  ) {}

  public static createRoot(logger: ILogger, services: ServicesSource, engine: Engine, instrument: InstrumentationHook | undefined): ServiceProvider {
    const root = new ServiceProvider(logger, services, engine, engine, undefined, instrument);
    engine.bindSurface(root);
    return root;
  }

  protected get root(): ServiceProvider {
    return this.rootProvider ?? this;
  }

  public resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    if (this.instrument === undefined) {
      return this.resolveInternal(identifier);
    }
    const start = performance.now();
    try {
      return this.resolveInternal(identifier);
    } finally {
      this.instrument({ kind: 'resolve', identifier: identifier.name, durationMs: performance.now() - start });
    }
  }

  // Only a scope can honestly serve the IScopedProvider token: asking for it declares a
  // need for scope semantics, which the root doesn't have. Overridden by
  // ScopedServiceProvider to hand back itself; the base throws a scope mismatch, not an
  // unregistered service: the token is bound by the engine, so nothing is missing — the
  // root simply cannot serve it.
  protected asScopedProvider(): IScopedProvider {
    throw new ScopeMismatchError(IScopedProvider);
  }

  private resolveInternal<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    if (identifier.prototype === IServiceProvider.prototype) {
      return this.root as IServiceProvider as T;
    }
    if (identifier.prototype === IResolutionScope.prototype) {
      return this as IResolutionScope as T;
    }
    if (identifier.prototype === IScopedProvider.prototype) {
      return this.asScopedProvider() as T;
    }
    this.logger.debug('Resolving', identifier.name);
    try {
      return this.scope.resolve(identifier);
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  // No short-circuit on an empty bucket: the engine answers that with an empty list
  // itself, and a surface token has no bucket to look in while still being resolvable.
  public resolveAll<T extends SourceType>(identifier: ServiceIdentifier<T>): T[] {
    return this.scope.resolveAll(identifier);
  }

  public createScope(): IScopedProvider {
    const scopeServices = this.Services.cloneShared();
    const engineScope = this.engine.createScope(() => scopeServices.snapshot());
    const scoped = new ScopedServiceProvider(this.logger, scopeServices, engineScope, this.engine, this.root, this.instrument);
    engineScope.bindSurface(scoped);
    return scoped;
  }

  public printGraph(write: (line: string) => void = console.log): void {
    this.scope.printGraph(write);
  }

  [Symbol.dispose](): void {
    this.scope[Symbol.dispose]();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.scope[Symbol.asyncDispose]();
  }
}

export class ScopedServiceProvider extends ServiceProvider<ScopeServicesSource> implements IScopedProvider {
  protected override asScopedProvider(): IScopedProvider {
    return this;
  }
}
