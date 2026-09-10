import { BuildCleanError } from './BuildCleanError';

/**
 * Thrown when a build succeeded without producing a metafile. The plugin turns
 * the metafile on itself, so its absence means something switched it back off.
 */
export class MissingMetafileError extends BuildCleanError {
  public constructor() {
    super('MissingMetafile', '[build-cleaner] No metafile available - ensure metafile is enabled');
  }
}
