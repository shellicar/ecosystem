import type { Engine, Scope, ServiceIdentifier, SourceType } from '@shellicar/core-di-engine';
import { IResolutionScope } from '@shellicar/core-di-engine';
import { IScopedProvider, IServiceProvider } from '../interfaces';
import type { ILogger } from '../logger';
import type { InstrumentationHook } from '../types';
import type { ScopeServicesSource, ServicesSource } from './types';

// The root provider: Services carries no .shadow(), matching the root collection it
// holds. ScopedServiceProvider (below) is the only source of a shadow-capable
// Services, born whenever createScope() opens a scope (the root's own or a nested one).
export class ServiceProvider implements IServiceProvider {
  protected constructor(
    protected readonly logger: ILogger,
    public readonly Services: ServicesSource,
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

  // Overridden by ScopedServiceProvider to hand back a genuinely IScopedProvider-shaped
  // self: the base class only promises IResolutionScope, since its Services isn't
  // shadow-capable and can't honestly satisfy IScopedProvider.
  protected asBoundary(): IResolutionScope {
    return this;
  }

  private resolveInternal<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    if (identifier.prototype === IServiceProvider.prototype) {
      return this.root as IServiceProvider as T;
    }
    if (identifier.prototype === IResolutionScope.prototype || identifier.prototype === IScopedProvider.prototype) {
      return this.asBoundary() as T;
    }
    this.logger.debug('Resolving', identifier.name);
    try {
      return this.scope.resolve(identifier);
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  public resolveAll<T extends SourceType>(identifier: ServiceIdentifier<T>): T[] {
    if (this.Services.get(identifier).length === 0) {
      return [];
    }
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

export class ScopedServiceProvider extends ServiceProvider implements IScopedProvider {
  public declare readonly Services: ScopeServicesSource;

  protected override asBoundary(): IScopedProvider {
    return this;
  }
}
