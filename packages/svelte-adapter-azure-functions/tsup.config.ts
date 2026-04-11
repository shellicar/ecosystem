import cleanPlugin from '@shellicar/build-clean/esbuild';
import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    cjsInterop: true,
    clean: false,
    dts: true,
    entry: ['src/**/*.ts'],
    external: ['@azure/functions-core', 'SHIMS', 'MANIFEST', 'SERVER', 'esbuild'],
    esbuildPlugins: [cleanPlugin({ destructive: true })],
    inject: ['cjs-shim.mts'],
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
    outDir: 'dist',
  },
]);
