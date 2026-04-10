import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    clean: true,
    dts: true,
    entry: ['src/**/*.ts'],
    keepNames: true,
    minify: config.watch ? false : 'terser',
    removeNodeProtocol: false,
    sourcemap: true,
    splitting: true,
    target: 'node22',
    treeshake: true,
    tsconfig: 'tsconfig.json',
  }) satisfies Options;

export default defineConfig((config) => [
  {
    ...commonOptions(config),
    format: 'esm',
    outDir: 'dist/esm',
  },
  {
    ...commonOptions(config),
    format: 'cjs',
    outDir: 'dist/cjs',
  },
]);
