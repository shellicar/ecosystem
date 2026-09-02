import { BuildCleanError } from './BuildCleanError';

/**
 * Thrown when the output directory carries the name of a directory that
 * normally holds source rather than build output.
 */
export class OutputDirectoryIsSourceError extends BuildCleanError {
  public readonly outDir: string;

  public constructor(outDir: string) {
    super('OutputDirectoryIsSource', `[build-cleaner] Refusing to clean source directory: "${outDir}". Use a build output directory like "dist" or "build".`);
    this.outDir = outDir;
  }
}
