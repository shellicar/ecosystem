import { Feature } from '../enums';
import type { Options } from '../types';

type DefaultOptions = Omit<Required<Options>, 'mainModule' | 'features'> & {
  features: Record<Feature, boolean>;
};

export const defaultOptions: DefaultOptions = {
  entryName: 'main',
  mainExport: 'default',
  sideEffectImports: [],
  loadLocalSettings: true,
  debug: false,
  features: {
    [Feature.EsbuildEntryInjection]: true,
    [Feature.CjsShimAutoInclude]: true,
  },
};
