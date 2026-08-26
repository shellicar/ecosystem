import { relative, resolve } from 'node:path';
import type { ILogger } from '../types';

// baseDir is esbuild's working directory. The project to protect is the one the
// build is rooted at, which is not always the process working directory.
export const validateOutDir = (outDir: string, baseDir: string, logger: ILogger) => {
  const resolvedOutDir = resolve(outDir);
  const relativePath = relative(baseDir, resolvedOutDir);
  const normalizedPath = outDir.replace(/\\/g, '/');
  const isAbsolutePath = resolve(outDir) !== resolve(baseDir, outDir);
  const isSameAsCurrentDir = resolvedOutDir === baseDir;
  const isParentOfCurrentDirUnix = baseDir.startsWith(`${resolvedOutDir}/`);
  const isParentOfCurrentDirWindows = baseDir.startsWith(`${resolvedOutDir}\\`);
  const isParentOfCurrentDir = isParentOfCurrentDirUnix || isParentOfCurrentDirWindows;
  const goesUpDirectory = relativePath.startsWith('..');

  logger.verbose('Path validation:');
  logger.verbose(`  Input: "${outDir}"`);
  logger.verbose(`  Base directory: "${baseDir}"`);
  logger.verbose(`  Resolved output directory: "${resolvedOutDir}"`);
  logger.verbose(`  Relative path from base directory: "${relativePath}"`);
  logger.verbose(`  Normalized path: "${normalizedPath}"`);
  logger.verbose(`  Is absolute path outside project: ${isAbsolutePath}`);
  logger.verbose(`  Is same as current directory: ${isSameAsCurrentDir}`);
  logger.verbose(`  Is parent of base directory (Unix): ${isParentOfCurrentDirUnix}`);
  logger.verbose(`  Is parent of base directory (Windows): ${isParentOfCurrentDirWindows}`);
  logger.verbose(`  Is parent of base directory: ${isParentOfCurrentDir}`);
  logger.verbose(`  Goes up directory levels: ${goesUpDirectory}`);

  // Check if the resolved path is the same as the base directory
  if (isSameAsCurrentDir) {
    throw new Error(`[build-cleaner] Refusing to clean current directory: "${outDir}". Use a subdirectory like "dist" or "build".`);
  }

  // Check if the resolved path is a parent of the base directory
  if (isParentOfCurrentDir) {
    throw new Error(`[build-cleaner] Refusing to clean parent directory: "${outDir}". This would delete the current project.`);
  }

  // Check if the relative path goes up (.., ../.., etc.)
  if (goesUpDirectory) {
    throw new Error(`[build-cleaner] Refusing to clean directory outside project: "${outDir}". Use a subdirectory like "dist" or "build".`);
  }

  // Check if it's an absolute path outside the project
  if (isAbsolutePath) {
    throw new Error(`[build-cleaner] Refusing to clean absolute path outside project: "${outDir}". Use a relative subdirectory.`);
  }

  // Prevent cleaning common source directories (even as subdirectories)
  const dangerousPaths = ['src', 'source', 'lib', 'app', 'components', 'pages', 'routes'];
  const isDangerousPath = dangerousPaths.some((dangerous) => normalizedPath === dangerous || normalizedPath.endsWith(`/${dangerous}`));

  if (isDangerousPath) {
    throw new Error(`[build-cleaner] Refusing to clean source directory: "${outDir}". Use a build output directory like "dist" or "build".`);
  }

  logger.debug(`Validated output directory: "${outDir}" -> "${resolvedOutDir}"`);
};
