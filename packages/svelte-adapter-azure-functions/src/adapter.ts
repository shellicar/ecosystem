import { writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Adapter, Builder } from '@sveltejs/kit';
import { type BuildOptions, build } from 'esbuild';
import { defaults } from './defaults';

export interface AzureFunctionsAdapterOptions {
  esbuildOptions?: BuildOptions;
}

export const createAdapter = (options: AzureFunctionsAdapterOptions = {}): Adapter => {
  return {
    name: 'adapter-azure-functions',
    async adapt(builder: Builder) {
      const { esbuildOptions = {} } = options;
      const publish = 'build';
      const tmp = builder.getBuildDirectory('adapter-azure-functions');
      const serverDir = join(publish, 'server');
      const staticDir = join(publish, 'static');

      builder.log.minor(`Publishing to "${publish}"`);
      builder.rimraf(publish);
      builder.rimraf(tmp);

      builder.log.minor('Copying assets...');
      builder.writeClient(staticDir);
      builder.writePrerendered(staticDir);

      const distFiles = fileURLToPath(new URL('../dist', import.meta.url));

      const relativePath = posix.relative(tmp, join(builder.getServerDirectory()));

      builder.log.minor('Generating serverless function...');
      builder.copy(distFiles, tmp, {
        replace: {
          MANIFEST: './manifest.js',
          SERVER: `${relativePath}/index.js`,
          SHIMS: './shims.js',
        },
      });

      writeFileSync(`${tmp}/manifest.js`, `export const manifest = ${builder.generateManifest({ relativePath })};\n`);

      await build({
        entryPoints: [`${tmp}/trigger.js`],
        outdir: join(serverDir, 'dist'),
        ...defaults,
        ...esbuildOptions,
      });

      const copyFiles = fileURLToPath(new URL('../files', import.meta.url));
      builder.log.minor('Copying files to server directory');
      builder.copy(copyFiles, serverDir);
    },
  };
};
