import type { Dirent } from 'node:fs';
import { readdir, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ILogger } from '../types';
import type { ResolvedOptions } from './types';

export const removeEmptyDirs = async (dir: string, options: ResolvedOptions): Promise<boolean> => {
  const { logger } = options;
  const entries = await getEntries(dir, logger);
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirs(join(dir, entry.name), options);
    }
  }

  const remaining = await readdir(dir);
  if (remaining.length > 0) {
    return false;
  }

  logger.info(`Removing empty directory: "${dir}"`);
  if (options.destructive) {
    await rmdir(dir);
  }
  return true;
};

const getEntries = async (dir: string, logger: ILogger): Promise<Dirent<string>[]> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    logger.error('Error reading directory:', error);
    return [];
  }
};
