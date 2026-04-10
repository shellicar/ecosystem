import cleanPlugin from '@shellicar/build-clean/esbuild';
import versionPlugin from '@shellicar/build-version/esbuild';
import type { Options } from '@shellicar/build-version/types';
import { defineConfig } from 'tsup';

const pluginOptions = {
  debug: true,
  strict: true,
  versionCalculator: () => ({
    branch: 'bob',
    version: '1.2.3',
  }),
} satisfies Options;

export default defineConfig(() => ({
  bundle: true,
  clean: false,
  dts: false,
  entry: ['src/main.ts'],
  esbuildPlugins: [cleanPlugin({ destructive: true }), versionPlugin(pluginOptions)],
  format: ['cjs'],
  keepNames: true,
  minify: false,
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'node22',
  treeshake: true,
  tsconfig: 'tsconfig.json',
}));
