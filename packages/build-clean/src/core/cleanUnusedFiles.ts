import { relative } from 'node:path';
import { Feature } from '../enums';
import { deleteFile } from './deleteFile';
import { getAllFiles } from './getAllFiles';
import { removeEmptyDirs } from './removeEmptyDirs';
import type { ResolvedOptions } from './types';
import { validateOutDir } from './validateOutDir';

export async function cleanUnusedFiles(outDir: string, builtFiles: Set<string>, options: ResolvedOptions): Promise<void> {
  const { logger } = options;
  validateOutDir(outDir, logger);

  try {
    logger.debug(`Starting cleanup of directory: "${outDir}"`);
    logger.debug(`Built files count: ${builtFiles.size}`);

    const existingFiles = await getAllFiles(outDir, logger);
    logger.debug(`Existing files count: ${existingFiles.length}`);

    if (existingFiles.length === 0 && builtFiles.size > 0) {
      logger.warn('Disable tsup "clean: true" to use this plugin. (You can ignore this message if this is the first time you have built your package)');
      return;
    }

    logger.info(`Processing ${existingFiles.length} existing files vs ${builtFiles.size} built files`);

    const filesToDelete: string[] = [];

    for (const file of existingFiles) {
      const relativePath = relative(process.cwd(), file);
      logger.verbose(`Checking file: "${relativePath}"`);

      if (!builtFiles.has(relativePath)) {
        filesToDelete.push(file);
        logger.verbose(`Marked for deletion: "${relativePath}"`);
      } else {
        logger.verbose(`Keeping built file: "${relativePath}"`);
      }
    }

    if (filesToDelete.length > 0) {
      const dryRunSuffix = options.destructive ? '' : ' (dry run)';
      logger.warn(`Files marked for deletion: ${filesToDelete.length}${dryRunSuffix}`);
    } else {
      logger.info('No files marked for deletion');
    }

    let deletedCount = 0;
    for (const file of filesToDelete) {
      const relativePath = relative(process.cwd(), file);

      logger.info(`Deleting: "${relativePath}"`);
      if (options.destructive) {
        await deleteFile(file, logger);
      }

      deletedCount++;
    }

    if (deletedCount === 0) {
      logger.info('No unused files found');
    } else if (!options.destructive) {
      logger.info(`Set destructive: true to actually delete the ${deletedCount} unused file(s)`);
    }

    if (options.features[Feature.RemoveEmptyDirs]) {
      await removeEmptyDirs(outDir, options);
    }
  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
}
