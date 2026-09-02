import { relative, resolve } from 'node:path';
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
    throw new Error(`[build-cleaner] Refusing to clean current directory: "${outDir}". Use a subdirectory like "dist" or "build".`);
  }

  // Check if the resolved path is a parent of the base directory
  if (isParentOfCurrentDir) {
    throw new Error(`[build-cleaner] Refusing to clean parent directory: "${outDir}". This would delete the current project.`);
  }

  // Outside the project, whether by climbing out or by having no route at all
  if (isOutside) {
    throw new Error(`[build-cleaner] Refusing to clean directory outside project: "${outDir}". Use a subdirectory like "dist" or "build".`);
  }

  // Prevent cleaning common source directories (even as subdirectories)
  const dangerousPaths = ['src', 'source', 'lib', 'app', 'components', 'pages', 'routes'];
  const isDangerousPath = dangerousPaths.some((dangerous) => normalizedPath === dangerous || normalizedPath.endsWith(`/${dangerous}`));

  if (isDangerousPath) {
    throw new Error(`[build-cleaner] Refusing to clean source directory: "${outDir}". Use a build output directory like "dist" or "build".`);
  }

  logger.debug(`Validated output directory: "${outDir}" -> "${resolvedOutDir}"`);

  return resolvedOutDir;
};
