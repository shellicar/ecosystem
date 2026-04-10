import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    clean: true,
    dts: true,
    entry: ['src/**/*.ts'],
    esbuildOptions: (options) => {
      options.chunkNames = 'chunks/[name]-[hash]';
      // entryNames flattens output paths, which causes collisions
      // between src/types.ts and src/core/types.ts
      // options.entryNames = '[name]';
    },
    keepNames: true,
    minify: false,
    platform: 'node',
    removeNodeProtocol: false,
    sourcemap: true,
    splitting: true,
    target: 'node22',
    treeshake: false,
    tsconfig: 'tsconfig.json',
  }) satisfies Options;

export default defineConfig((config) => [
  { ...commonOptions(config), format: 'esm', outDir: 'dist/esm' },
  { ...commonOptions(config), format: 'cjs', outDir: 'dist/cjs' },
]);
