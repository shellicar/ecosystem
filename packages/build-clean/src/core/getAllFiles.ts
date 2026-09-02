import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ILogger } from '../types';

const isNotFound = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

export async function getAllFiles(dir: string, logger: ILogger): Promise<string[]> {
  const files: string[] = [];

  try {
    logger.verbose(`Reading directory: "${dir}"`);
    const entries = await readdir(dir, { withFileTypes: true });
    logger.verbose(`Found ${entries.length} entries in "${dir}"`);

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        logger.verbose(`Recursing into subdirectory: "${entry.name}"`);
        const subFiles = await getAllFiles(fullPath, logger);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
        logger.verbose(`Found file: "${entry.name}"`);
      }
    }
  } catch (error) {
    // A directory that is not there yet is the ordinary first-build case and
    // means no files. Anything else means the directory cannot be read, which is
    // not the same thing and must not be reported as an empty one.
    if (!isNotFound(error)) {
      throw error;
    }
    logger.debug(`Directory does not exist yet: "${dir}"`);
  }

  logger.verbose(`Total files found in "${dir}": ${files.length}`);
  return files;
}
