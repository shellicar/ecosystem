import plugin from '@shellicar/build-azure-local-settings/esbuild';
import { build } from 'esbuild';

await build({
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  plugins: [
    plugin({
      mainModule: './src/main.ts',
    }),
  ],
});
