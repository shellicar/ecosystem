import { relative, resolve } from 'node:path';
import type { ILogger } from '../types';

export const validateOutDir = (outDir: string, logger: ILogger) => {
  const cwd = process.cwd();
  const resolvedOutDir = resolve(outDir);
  const relativePath = relative(cwd, resolvedOutDir);
  const normalizedPath = outDir.replace(/\\/g, '/');
  const isAbsolutePath = resolve(outDir) !== resolve(cwd, outDir);
  const isSameAsCurrentDir = resolvedOutDir === cwd;
  const isParentOfCurrentDirUnix = cwd.startsWith(`${resolvedOutDir}/`);
  const isParentOfCurrentDirWindows = cwd.startsWith(`${resolvedOutDir}\\`);
  const isParentOfCurrentDir = isParentOfCurrentDirUnix || isParentOfCurrentDirWindows;
  const goesUpDirectory = relativePath.startsWith('..');

  logger.verbose('Path validation:');
  logger.verbose(`  Input: "${outDir}"`);
  logger.verbose(`  Current working directory: "${cwd}"`);
  logger.verbose(`  Resolved output directory: "${resolvedOutDir}"`);
  logger.verbose(`  Relative path from cwd: "${relativePath}"`);
  logger.verbose(`  Normalized path: "${normalizedPath}"`);
  logger.verbose(`  Is absolute path outside project: ${isAbsolutePath}`);
  logger.verbose(`  Is same as current directory: ${isSameAsCurrentDir}`);
  logger.verbose(`  Is parent of current directory (Unix): ${isParentOfCurrentDirUnix}`);
  logger.verbose(`  Is parent of current directory (Windows): ${isParentOfCurrentDirWindows}`);
  logger.verbose(`  Is parent of current directory: ${isParentOfCurrentDir}`);
  logger.verbose(`  Goes up directory levels: ${goesUpDirectory}`);

  // Check if the resolved path is the same as current directory
  if (isSameAsCurrentDir) {
    throw new Error(`[build-cleaner] Refusing to clean current directory: "${outDir}". Use a subdirectory like "dist" or "build".`);
  }

  // Check if the resolved path is a parent of current directory
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
