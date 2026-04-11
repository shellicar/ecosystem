import cleanPlugin from '@shellicar/build-clean/esbuild';
import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    clean: false,
    dts: true,
    esbuildPlugins: [cleanPlugin({ destructive: true })],
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
