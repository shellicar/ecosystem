import { defineConfig, type Options } from 'tsup';

// Every module is an entry, deliberately (see core-di-engine's config): a
// single-entry bundle collapses the package into one file a consumer's bundler
// cannot tree-shake per module, and plain bundle:false emits extensionless
// imports Node's ESM loader rejects.
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
