import type { Options } from '@shellicar/build-azure-local-settings';
import localSettingsPlugin from '@shellicar/build-azure-local-settings/esbuild';
import esbuild from 'esbuild';

const watch = process.argv.some((x) => x === '--watch');

const options: Options = {
  mainModule: './src/main.ts',
  mainExport: 'main',
  loadLocalSettings: watch,
  debug: true,
};

const ctx = await esbuild.context({
  entryPoints: {},
  outdir: 'dist',
  minify: false,
  bundle: true,
  platform: 'node',
  target: 'node22',
  splitting: true,
  format: 'esm',
  tsconfig: 'tsconfig.json',
  plugins: [localSettingsPlugin(options)],
});

if (watch) {
  await ctx.watch();
  console.log('watching...');
} else {
  await ctx.rebuild();
  ctx.dispose();
}
