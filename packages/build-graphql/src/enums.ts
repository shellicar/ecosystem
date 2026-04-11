export enum ErrorPolicy {
  Abort = 'ABORT',
  Report = 'REPORT',
  Ignore = 'IGNORE',
}

export enum Feature {
  /**
   * Enables esbuild's file watch mode.
   */
  EsbuildWatch = 'ESBUILD_WATCH',

  /**
   * Enables vite's file watch mode.
   */
  ViteWatch = 'VITE_WATCH',

  /**
   * Enables vite Hot Module Reload functionality.
   * Requires {@link Feature.ViteWatch} to be enabled to function.
   */
  ViteHmr = 'VITE_HMR',
}
