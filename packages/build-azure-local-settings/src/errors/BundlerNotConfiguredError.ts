/**
 * Error thrown when esbuild's bundle option is not enabled.
 * Without bundling, imports in the virtual entry point are not resolved.
 */
export class BundlerNotConfiguredError extends Error {
  public constructor() {
    super('build-azure-local-settings requires esbuild bundle option to be enabled. ' + 'Without bundling, imports in the generated entry point are not resolved.');
    this.name = 'BundlerNotConfiguredError';
  }
}
