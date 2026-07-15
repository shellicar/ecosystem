// ScopeServicesSource lives here (not the engine): it references
// IServiceCollection, which is core-di's surface.
import type { DescriptorMap } from '@shellicar/core-di-engine';
import type { IServiceCollection } from '../interfaces';

export type ScopeServicesSource = IServiceCollection & {
  cloneShared(): ScopeServicesSource;
  snapshot(): { readonly services: DescriptorMap; readonly version: number; };
};
