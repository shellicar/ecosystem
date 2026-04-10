import { Feature } from '../enums';
import type { Options } from '../types';

export const defaultOptions = {
  debug: false,
  verbose: false,
  destructive: false,
  features: {
    [Feature.RemoveEmptyDirs]: true,
  },
} as const satisfies Options;
