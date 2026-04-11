import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    clean: true,
    dts: true,
    entry: ['src/index.ts'],
    esbuildOptions: (options) => {
      options.chunkNames = 'chunks/[name]-[hash]';
      options.entryNames = '[name]';
    },
    inject: ['inject.ts'],
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
