import { BuildCleanError } from './BuildCleanError';

/**
 * Thrown when the output directory lies outside the directory the build is
 * rooted at, whether by climbing out of it or by being on another root.
 */
export class OutputDirectoryOutsideBaseError extends BuildCleanError {
  public readonly outDir: string;

  public constructor(outDir: string) {
    super('OutputDirectoryOutsideBase', `[build-cleaner] Refusing to clean directory outside project: "${outDir}". Use a subdirectory like "dist" or "build".`);
    this.outDir = outDir;
  }
}
