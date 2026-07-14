import type { IServiceCollection } from '../interfaces';
import { IResolutionScope, IScopedProvider, IServiceProvider } from '../interfaces';
import type { ILogger } from '../logger';
import type { ServiceIdentifier, SourceType } from '../types';
import type { Engine, Scope } from './boundaryEngine';

/**
 * The internal surface {@link ServiceProvider} needs from its collection beyond
 * `IServiceCollection`: the share-references clone that backs a scope's own
 * collection, and the live registration snapshot the engine's per-scope view
 * reads (dynamic scope registration, decisions.md §7).
 */
export type ScopeServicesSource = IServiceCollection & {
  cloneShared(): ScopeServicesSource;
  snapshot(): { readonly services: import('../types').DescriptorMap; readonly version: number };
};

/**
 * The public resolution surface over the boundary engine — the provider root
 * and every scope are instances of this one wrapper, differing only in which
 * engine surface they hold and which collection is theirs.
 *
 * The wrapper owns what the engine deliberately does not: the three self-token
 * short-circuits for direct `resolve` calls (the engine handles the same tokens
 * inside plans via its surface steps), per-resolution logging, and the scope's
 * own `Services` collection whose registrations extend the scope's plans.
 */
export class ServiceProvider implements IServiceProvider, IScopedProvider {
  private constructor(
    private readonly logger: ILogger,
    public readonly Services: ScopeServicesSource,
    private readonly scope: Scope,
    private readonly engine: Engine,
    private readonly rootProvider: ServiceProvider | undefined,
  ) {}

  public static createRoot(logger: ILogger, services: ScopeServicesSource, engine: Engine): ServiceProvider {
    const root = new ServiceProvider(logger, services, engine, engine, undefined);
    // Bind the wrapper as the root boundary's surface, so a surface token
    // resolved inside a plan yields this provider, not the engine internals.
    engine.bindSurface(root);
    return root;
  }

  private get root(): ServiceProvider {
    return this.rootProvider ?? this;
  }

  public resolve<T extends SourceType>(identifier: ServiceIdentifier<T>): T {
    // The self-tokens resolve to the boundary surface the call went through
    // (decisions.md §7): scope tokens to this surface, the provider token to the
    // root. Never the in-pass scope — a later call through an injected surface
    // is a fresh pass.
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
    // No registrations is an empty result for resolveAll, not an error — the
    // "how many are there?" question has a valid answer of none.
    if (this.Services.get(identifier).length === 0) {
      return [];
    }
    return this.scope.resolveAll(identifier);
  }

  public createScope(): IScopedProvider {
    // The scope's collection shares the descriptor objects of this provider's
    // frozen collection — node identity is what lets the engine's per-scope view
    // share every feature cache and held error with the root — while its own
    // arrays keep dynamic registrations from leaking to the parent.
    const scopeServices = this.Services.cloneShared();
    const engineScope = this.engine.createScope(() => scopeServices.snapshot());
    const scoped = new ServiceProvider(this.logger, scopeServices, engineScope, this.engine, this.root);
    engineScope.bindSurface(scoped);
    return scoped;
  }

  [Symbol.dispose](): void {
    this.scope[Symbol.dispose]();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.scope[Symbol.asyncDispose]();
  }
}
