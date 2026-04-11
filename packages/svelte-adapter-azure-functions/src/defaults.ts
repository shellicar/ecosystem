import type { BuildOptions } from 'esbuild';

export const defaults: BuildOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  treeShaking: true,
  format: 'esm',
  splitting: true,
  minify: true,
  keepNames: true,
  sourcemap: true,
  outExtension: { '.js': '.mjs' },
};
