import cleanPlugin from '@shellicar/build-clean/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig((config) => ({
  bundle: true,
  clean: false,
  dts: false,
  entry: ['src/**/*.ts'],
  esbuildPlugins: [cleanPlugin({ destructive: true })],
  format: ['esm'],
  keepNames: true,
  minify: config.watch ? false : 'terser',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'node22',
  treeshake: true,
  tsconfig: 'tsconfig.json',
}));
