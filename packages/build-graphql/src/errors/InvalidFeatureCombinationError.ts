import type { Feature } from '../enums';

/**
 * Error thrown if incompatible features are configured.
 */
export class InvalidFeatureCombinationError extends Error {
  public constructor(
    public readonly feature: Feature,
    public readonly requires: Feature,
  ) {
    super(`${feature} requires ${requires} to be enabled.`);
    this.name = 'InvalidFeatureCombinationError';
  }
}
