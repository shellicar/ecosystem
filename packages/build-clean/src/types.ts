import type { Feature } from './enums';

export { Feature } from './enums';

export interface ILogger {
  debug: (message: string, ...args: unknown[]) => void;
  verbose: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface Options {
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Actually delete files (when false, runs in dry-run mode)
   * @default false
   */
  destructive?: boolean;

  /**
   * Turn a refusal to clean into a build failure. When false the plugin logs the
   * refusal and leaves the output directory alone.
   * @default false
   */
  strict?: boolean;

  /**
   * Feature flags for optional functionality
   */
  features?: Features;

  /**
   * Custom logger instance. If provided, debug/verbose options are ignored.
   */
  logger?: ILogger;
}

export type Features = Partial<Record<Feature, boolean>>;
