// ScopeServicesSource lives here (not the engine): it references
// IScopedServiceCollection, which is core-di's surface.
import type { DescriptorMap } from '@shellicar/core-di-engine';
import type { IScopedServiceCollection } from '../interfaces';

export type ScopeServicesSource = IScopedServiceCollection & {
  cloneShared(): ScopeServicesSource;
  snapshot(): { readonly services: DescriptorMap; readonly version: number };
};
