import cleanPlugin from '@shellicar/build-clean/esbuild';
import graphqlPlugin from '@shellicar/build-graphql/esbuild';
import type { Options } from '@shellicar/build-graphql/types';
import { defineConfig } from 'tsup';

const options: Options = {
  globPattern: '../**/*.graphql',
  debug: true,
};

export default defineConfig((config) => ({
  bundle: true,
  clean: false,
  dts: true,
  entry: ['src/main.ts'],
  esbuildPlugins: [cleanPlugin({ destructive: true }), graphqlPlugin(options)],
  format: ['cjs'],
  keepNames: true,
  minify: config.watch ? false : 'terser',
  outDir: 'dist',
  sourcemap: true,
  splitting: true,
  target: 'node22',
  treeshake: true,
  tsconfig: 'tsconfig.json',
}));
