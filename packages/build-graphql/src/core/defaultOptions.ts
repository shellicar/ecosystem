import { Feature } from '../enums';
import type { Options } from '../types';

export const defaultOptions = {
  globPattern: '**/*.graphql',
  globIgnore: '**/node_modules/**',
  debug: false,
  globOptions: {},
  features: {
    [Feature.EsbuildWatch]: true,
    [Feature.ViteWatch]: true,
    [Feature.ViteHmr]: true,
  },
  compareFn: (a: string, b: string) => a.localeCompare(b),
} as const satisfies Options;
