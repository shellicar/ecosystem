import type { Feature } from '../enums';
import type { Options } from '../types';

type FullFeatures = Record<Feature, boolean>;

type RequiredOptions = 'debug' | 'verbose' | 'destructive' | 'features' | 'logger';

type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type ResolvedOptions = MakeRequired<Options, RequiredOptions> & {
  features: FullFeatures;
};
