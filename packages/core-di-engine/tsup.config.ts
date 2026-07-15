import { defineConfig, type Options } from 'tsup';

// Every module is an entry, deliberately. A single-entry bundle collapses the
// package into one file, so a consumer's bundler cannot tree-shake per module
// (and the polyfill's side effect once vanished into an unlisted chunk).
// Plain bundle:false is no better: tsup emits extensionless relative imports
// that Node's ESM loader rejects. Per-module entries with splitting keep the
// module boundaries AND valid, Node-loadable output.
const commonOptions = (config: Options) =>
  ({
    bundle: true,
    clean: true,
    dts: true,
    entry: ['src/**/*.ts'],
    esbuildOptions: (options) => {
      options.chunkNames = 'chunks/[name]-[hash]';
    },
    keepNames: true,
    minify: false,
    platform: 'node',
    removeNodeProtocol: false,
    sourcemap: true,
    splitting: true,
    target: 'node22',
    treeshake: false,
    watch: config.watch ?? undefined,
    tsconfig: 'tsconfig.json',
  }) satisfies Options;

export default defineConfig((config) => [
  { ...commonOptions(config), format: 'esm', outDir: 'dist/esm' },
  { ...commonOptions(config), format: 'cjs', outDir: 'dist/cjs' },
]);
