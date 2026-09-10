import { relative, resolve } from 'node:path';
import { OutputDirectoryContainsBaseError } from '../errors/OutputDirectoryContainsBaseError';
import { OutputDirectoryIsBaseError } from '../errors/OutputDirectoryIsBaseError';
import { OutputDirectoryIsSourceError } from '../errors/OutputDirectoryIsSourceError';
import { OutputDirectoryOutsideBaseError } from '../errors/OutputDirectoryOutsideBaseError';
import type { ILogger } from '../types';
import { isOutsideBase } from './isOutsideBase';

// outDir is the value the caller configured, kept in that form so the refusals
// name what they would go and change. baseDir is esbuild's working directory:
// the project to protect is the one the build is rooted at, which is not always
// the process working directory. Returns the resolved directory so one place
// decides what was validated and what gets cleaned.
export const validateOutDir = (outDir: string, baseDir: string, logger: ILogger): string => {
  const resolvedOutDir = resolve(baseDir, outDir);
  const relativePath = relative(baseDir, resolvedOutDir);
  const normalizedPath = outDir.replace(/\\/g, '/');
  const isSameAsCurrentDir = resolvedOutDir === baseDir;
  const isParentOfCurrentDirUnix = baseDir.startsWith(`${resolvedOutDir}/`);
  const isParentOfCurrentDirWindows = baseDir.startsWith(`${resolvedOutDir}\\`);
  const isParentOfCurrentDir = isParentOfCurrentDirUnix || isParentOfCurrentDirWindows;
  const isOutside = isOutsideBase(baseDir, resolvedOutDir);

  logger.verbose('Path validation:');
  logger.verbose(`  Input: "${outDir}"`);
  logger.verbose(`  Base directory: "${baseDir}"`);
  logger.verbose(`  Resolved output directory: "${resolvedOutDir}"`);
  logger.verbose(`  Relative path from base directory: "${relativePath}"`);
  logger.verbose(`  Normalized path: "${normalizedPath}"`);
  logger.verbose(`  Is same as base directory: ${isSameAsCurrentDir}`);
  logger.verbose(`  Is parent of base directory (Unix): ${isParentOfCurrentDirUnix}`);
  logger.verbose(`  Is parent of base directory (Windows): ${isParentOfCurrentDirWindows}`);
  logger.verbose(`  Is parent of base directory: ${isParentOfCurrentDir}`);
  logger.verbose(`  Is outside the base directory: ${isOutside}`);

  // Check if the resolved path is the same as the base directory
  if (isSameAsCurrentDir) {
    throw new OutputDirectoryIsBaseError(outDir);
  }

  // Check if the resolved path is a parent of the base directory
  if (isParentOfCurrentDir) {
    throw new OutputDirectoryContainsBaseError(outDir);
  }

  // Outside the project, whether by climbing out or by having no route at all
  if (isOutside) {
    throw new OutputDirectoryOutsideBaseError(outDir);
  }

  // Prevent cleaning common source directories (even as subdirectories)
  const dangerousPaths = ['src', 'source', 'lib', 'app', 'components', 'pages', 'routes'];
  const isDangerousPath = dangerousPaths.some((dangerous) => normalizedPath === dangerous || normalizedPath.endsWith(`/${dangerous}`));

  if (isDangerousPath) {
    throw new OutputDirectoryIsSourceError(outDir);
  }

  logger.debug(`Validated output directory: "${outDir}" -> "${resolvedOutDir}"`);

  return resolvedOutDir;
};
