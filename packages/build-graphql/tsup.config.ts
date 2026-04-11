import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    clean: true,
    dts: true,
    entry: ['src/**/*.ts'],
    esbuildOptions: (options) => {
      options.chunkNames = 'chunks/[name]-[hash]';
      // entryNames not set: this package has nested entry points (src/core/*.ts)
      // that the export map references as dist/esm/core/*.js
    },
    keepNames: true,
    minify: false,
    platform: 'node',
    removeNodeProtocol: false,
    sourcemap: true,
    splitting: true,
    target: 'node22',
    treeshake: false,
    watch: config.watch,
    tsconfig: 'tsconfig.json',
  }) satisfies Options;

export default defineConfig((config) => [
  { ...commonOptions(config), format: 'esm', outDir: 'dist/esm' },
  { ...commonOptions(config), format: 'cjs', outDir: 'dist/cjs' },
]);
