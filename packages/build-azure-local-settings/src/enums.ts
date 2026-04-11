import type { Options } from './types';

export enum Feature {
  /**
   * Enables automatic entry point injection for esbuild.
   * When enabled, `virtual:azure-local-settings/main` is automatically added to esbuild's entryPoints.
   * Note: `main` is the default value of {@link Options.entryName}.
   */
  EsbuildEntryInjection = 'ESBUILD_ENTRY_INJECTION',

  /**
   * Enables automatic cjs-shim import for ESM builds.
   * The cjs-shim provides `require`, `__filename`, and `__dirname` globals
   * which are needed when bundling CJS dependencies in ESM output.
   */
  CjsShimAutoInclude = 'CJS_SHIM_AUTO_INCLUDE',
}
