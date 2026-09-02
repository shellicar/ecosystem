import { relative, resolve } from 'node:path';
import { Feature } from '../enums';
import { deleteFile } from './deleteFile';
import { fileIdentity } from './fileIdentity';
import { getAllFiles } from './getAllFiles';
import { removeEmptyDirs } from './removeEmptyDirs';
import type { ResolvedOptions } from './types';
import { validateOutDir } from './validateOutDir';

// Nothing is deleted when the plugin cannot trust what it is looking at. The
// refusal is loud but does not fail the build unless the caller asked for that,
// because a plugin that starts breaking builds on upgrade is its own incident.
// Thrown only by refuse, so the catch below can let it through without logging
// a refusal that has already been reported.
class RefusalError extends Error {}

const refuse = (reason: string, options: ResolvedOptions, cause?: unknown): void => {
  const message = `[build-cleaner] Refusing to clean. ${reason}`;

  // Passing an absent cause still counts as an argument, and the logger spreads
  // its arguments, so the word undefined would reach the user.
  if (cause === undefined) {
    options.logger.error(message);
  } else {
    options.logger.error(message, cause);
  }

  if (options.strict) {
    throw new RefusalError(message, { cause });
  }
};

// baseDir is esbuild's working directory, which is what its metafile paths are
// relative to. It is not always the process working directory.
export async function cleanUnusedFiles(outDir: string, builtFiles: Set<string>, baseDir: string, options: ResolvedOptions): Promise<void> {
  const { logger } = options;
  const resolvedOutDir = validateOutDir(outDir, baseDir, logger);

  try {
    logger.debug(`Starting cleanup of directory: "${resolvedOutDir}"`);
    logger.debug(`Built files count: ${builtFiles.size}`);

    let existingFiles: string[];
    try {
      existingFiles = await getAllFiles(resolvedOutDir, logger);
    } catch (error) {
      return refuse(`Could not read the output directory: "${resolvedOutDir}"`, options, error);
    }
    logger.debug(`Existing files count: ${existingFiles.length}`);

    if (existingFiles.length === 0 && builtFiles.size > 0) {
      logger.warn('Disable tsup "clean: true" to use this plugin. (You can ignore this message if this is the first time you have built your package)');
      return;
    }

    logger.info(`Processing ${existingFiles.length} existing files vs ${builtFiles.size} built files`);

    const builtIdentities = new Set<string>();
    for (const builtFile of builtFiles) {
      const identity = await fileIdentity(resolve(baseDir, builtFile));
      if (identity !== undefined) {
        builtIdentities.add(identity);
      }
    }
    logger.debug(`Resolved ${builtIdentities.size} of ${builtFiles.size} built files on disk`);

    // Every output the build reported is missing from where it should be, so
    // this directory is not the one that was built into. Deleting what does not
    // match would take all of it.
    if (builtIdentities.size === 0) {
      const reason = builtFiles.size === 0 ? 'The build reported no output files' : `None of the ${builtFiles.size} files the build reported were found under "${resolvedOutDir}"`;
      return refuse(reason, options);
    }

    const filesToDelete: string[] = [];

    for (const file of existingFiles) {
      const relativePath = relative(baseDir, file);
      logger.verbose(`Checking file: "${relativePath}"`);

      const identity = await fileIdentity(file);
      if (identity === undefined || !builtIdentities.has(identity)) {
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
      const relativePath = relative(baseDir, file);

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
      await removeEmptyDirs(resolvedOutDir, options);
    }
  } catch (error) {
    if (error instanceof RefusalError) {
      throw error;
    }
    logger.error('Error during cleanup:', error);
    throw error;
  }
}
