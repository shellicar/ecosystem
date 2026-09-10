import { BuildCleanError } from './BuildCleanError';

/**
 * Thrown when the plugin cannot tell what it is looking at and declines to
 * delete anything. Only thrown when `strict` is on; otherwise the refusal is
 * logged and the build carries on.
 */
export class CleanRefusedError extends BuildCleanError {
  public readonly reason: string;

  public constructor(reason: string, options?: ErrorOptions) {
    super('CleanRefused', `[build-cleaner] Refusing to clean. ${reason}`, options);
    this.reason = reason;
  }
}
