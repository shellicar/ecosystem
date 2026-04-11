import { defineConfig, type Options } from 'tsup';

const commonOptions = (config: Options) =>
  ({
    bundle: true,
    cjsInterop: true,
    clean: true,
    dts: true,
    entry: ['src/**/*.ts'],

    external: ['@azure/functions-core', 'SHIMS', 'MANIFEST', 'SERVER', 'esbuild'],
    inject: ['cjs-shim.mts'],
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

export default defineConfig((config) => [{ ...commonOptions(config), format: 'esm', outDir: 'dist' }]);
