import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ILogger } from '../types';

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
    // Directory might not exist yet
    logger.debug(`Could not read directory "${dir}":`, error);
  }

  logger.verbose(`Total files found in "${dir}": ${files.length}`);
  return files;
}
