import type { Feature } from './enums';

export interface Options {
  /**
   * The name for the entry point in esbuild's entryPoints
   * @default 'main'
   * @example 'main'
   */
  entryName?: string;

  /**
   * Path to the main module to import and run
   * @example './src/main.ts'
   */
  mainModule: string;

  /**
   * The export to import from mainModule.
   * Use 'default' for default exports, or specify a named export.
   * @default 'default'
   */
  mainExport?: string;

  /**
   * Side-effect imports to include before the main module
   * These are imports that execute code on load (e.g., 'dotenv/config')
   * @example ['dotenv/config', './cjs-shim']
   */
  sideEffectImports?: string[];

  /**
   * Whether to load local.settings.json with Key Vault reference resolution
   * @default true
   */
  loadLocalSettings?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Feature flags for bundler-specific functionality
   */
  features?: Features;
}

export type Features = Partial<Record<Feature, boolean>>;
