import { glob } from 'glob';
import type { ResolvedOptions } from './types';

export const findFiles = async (options: ResolvedOptions): Promise<string[]> => {
  const files = await glob(options.globPattern, options.globOptions);
  files.sort(options.compareFn);
  return files;
};
