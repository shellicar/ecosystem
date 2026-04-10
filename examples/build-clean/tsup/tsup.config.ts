import cleanPlugin from '@shellicar/build-clean/esbuild';
import { defineConfig, type Options } from 'tsup';

const commonOptions = {
  entry: ['src/main.ts', 'src/index.ts'],
  splitting: true,
  sourcemap: true,
  treeshake: true,
  dts: true,
  clean: false,
  minify: false,
  keepNames: true,
  bundle: true,
  tsconfig: 'tsconfig.json',
  target: 'node22',
  esbuildPlugins: [
    cleanPlugin({
      destructive: true,
      verbose: true,
      debug: true,
    }),
  ],
} satisfies Options;

/**
 * tsup doesn't provide any way for the esbuild process to access the tsup config.
 * When targeting multiple formats, we need to define separate configurations for each format.
 * The separate outdir ensures that the output files for each format do not conflict.
 */
export default defineConfig((config) => [
  {
    ...commonOptions,
    format: 'esm',
    outDir: 'dist/esm',
  },
  {
    ...commonOptions,
    format: 'cjs',
    outDir: 'dist/cjs',
  },
]);
