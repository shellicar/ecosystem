// ServicesSource/ScopeServicesSource live here (not the engine): they reference
// IServiceCollection/IScopedServiceCollection, which are core-di's surface.
import type { DescriptorMap } from '@shellicar/core-di-engine';
import type { IScopedServiceCollection, IServiceCollection } from '../interfaces';

/** What a root ServiceProvider needs from its collection: itself, plus the ability to open the first scope. */
export type ServicesSource = IServiceCollection & {
  cloneShared(): ScopeServicesSource;
  snapshot(): { readonly services: DescriptorMap; readonly version: number };
};

/** What a scope's ServiceProvider needs: the same, but shadow-capable. */
export type ScopeServicesSource = ServicesSource & IScopedServiceCollection;
