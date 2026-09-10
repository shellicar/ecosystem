import { BuildCleanError } from './BuildCleanError';

/**
 * Thrown when the build specifies no output directory, so there is nothing for
 * the plugin to clean.
 */
export class MissingOutputDirectoryError extends BuildCleanError {
  public constructor() {
    super('MissingOutputDirectory', '[build-cleaner] No output directory specified in build options');
  }
}
