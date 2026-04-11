import graphqlPlugin from '@shellicar/build-graphql/esbuild';
import type { Options } from '@shellicar/build-graphql/types';
import esbuild from 'esbuild';

const watch = process.argv.some((x) => x === '--watch');

const options: Options = {
  globPattern: '../**/*.graphql',
  debug: true,
};

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  outdir: 'dist',
  minify: false,
  bundle: true,
  platform: 'node',
  target: 'node20',
  splitting: true,
  format: 'esm',
  tsconfig: 'tsconfig.json',
  plugins: [graphqlPlugin(options)],
});
if (watch) {
  await ctx.watch();
  console.log('watching...');
} else {
  await ctx.rebuild();
  ctx.dispose();
}
