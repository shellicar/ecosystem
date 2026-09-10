import { BuildCleanError } from './BuildCleanError';

/**
 * Thrown when the output directory is the directory the build is rooted at.
 */
export class OutputDirectoryIsBaseError extends BuildCleanError {
  public readonly outDir: string;

  public constructor(outDir: string) {
    super('OutputDirectoryIsBase', `[build-cleaner] Refusing to clean current directory: "${outDir}". Use a subdirectory like "dist" or "build".`);
    this.outDir = outDir;
  }
}
