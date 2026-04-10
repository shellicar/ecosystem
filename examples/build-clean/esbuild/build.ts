import { argv } from 'node:process';
import cleanPlugin from '@shellicar/build-clean/esbuild';
import { context } from 'esbuild';

const watch = argv.some((x) => x === '--watch');

const ctx = await context({
  entryPoints: ['src/main.ts'],
  format: 'esm',
  splitting: true,
  minify: false,
  bundle: true,
  keepNames: true,
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  treeShaking: true,
  outdir: 'dist',
  tsconfig: 'tsconfig.json',
  plugins: [cleanPlugin()],
});

if (watch) {
  await ctx.watch();
} else {
  try {
    await ctx.rebuild();
  } finally {
    ctx.dispose();
  }
}
