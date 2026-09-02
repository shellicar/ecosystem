import { BuildCleanError } from './BuildCleanError';

/**
 * Thrown when the output directory contains the directory the build is rooted at.
 */
export class OutputDirectoryContainsBaseError extends BuildCleanError {
  public readonly outDir: string;

  public constructor(outDir: string) {
    super('OutputDirectoryContainsBase', `[build-cleaner] Refusing to clean parent directory: "${outDir}". This would delete the current project.`);
    this.outDir = outDir;
  }
}
