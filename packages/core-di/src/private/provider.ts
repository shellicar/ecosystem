import { IResolutionScope, IScopedProvider, IServiceProvider } from '../interfaces';
import type { ILogger } from '../logger';
import type { InstrumentationHook, ServiceIdentifier, SourceType } from '../types';
import type { Engine, Scope } from './boundaryEngine';
import type { ScopeServicesSource } from './types';

export class ServiceProvider implements IServiceProvider, IScopedProvider {
  private constructor(
    private readonly logger: ILogger,
    public readonly Services: ScopeServicesSource,
    private readonly scope: Scope,
    private readonly engine: Engine,
    private readonly rootProvider: ServiceProvider | undefined,
    private readonly instrument: InstrumentationHook | undefined,
  ) {}

  public static createRoot(logger: ILogger, services: ScopeServicesSource, engine: Engine, instrument: InstrumentationHook | undefined): ServiceProvider {
    const root = new ServiceProvider(logger, services, engine, engine, undefined, instrument);
    engine.bindSurface(root);
    return root;
  }

  private get root(): ServiceProvider {
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

  private resolveInternal<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    if (identifier.prototype === IServiceProvider.prototype) {
      return this.root as IServiceProvider as T;
    }
    if (identifier.prototype === IResolutionScope.prototype || identifier.prototype === IScopedProvider.prototype) {
      return this as IResolutionScope & IScopedProvider as T;
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
    const scoped = new ServiceProvider(this.logger, scopeServices, engineScope, this.engine, this.root, this.instrument);
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
