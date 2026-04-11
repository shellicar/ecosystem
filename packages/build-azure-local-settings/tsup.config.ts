import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    clean: true,
    dts: true,
    esbuildOptions: (options) => {
      options.chunkNames = 'chunks/[name]-[hash]';
      options.entryNames = '[name]';
    },
    keepNames: true,
    minify: false,
    platform: 'node',
    removeNodeProtocol: false,
    sourcemap: true,
    splitting: true,
    target: 'node22',
    treeshake: false,
    watch: config.watch ?? false,
    tsconfig: 'tsconfig.json',
  }) satisfies Options;

export default defineConfig((config) => [
  {
    ...commonOptions(config),
    entry: ['src/index.ts', 'src/esbuild.ts', 'src/runtime.ts', 'src/cjs-shim.ts'],
    format: 'esm',
    outDir: 'dist/esm',
  },
  {
    ...commonOptions(config),
    entry: ['src/index.ts', 'src/esbuild.ts', 'src/runtime.ts'],
    format: 'cjs',
    outDir: 'dist/cjs',
  },
]);
