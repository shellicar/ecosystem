import type { Options } from '@shellicar/build-azure-local-settings';
import localSettingsPlugin from '@shellicar/build-azure-local-settings/esbuild';
import cleanPlugin from '@shellicar/build-clean/esbuild';
import { defineConfig } from 'tsup';

const options: Options = {
  mainModule: './src/main.ts',
  loadLocalSettings: true,
  debug: true,
};

export default defineConfig(() => ({
  bundle: true,
  clean: false,
  dts: false,
  entry: ['src/entry.ts'],
  esbuildOptions: (opts) => {
    opts.entryNames = 'entry/[name]';
  },
  esbuildPlugins: [cleanPlugin({ destructive: true }), localSettingsPlugin(options)],
  format: ['cjs'],
  keepNames: true,
  minify: false,
  outDir: 'dist',
  sourcemap: true,
  splitting: false,
  target: 'node22',
  treeshake: true,
  tsconfig: 'tsconfig.json',
}));
