import type { UnpluginFactory, UnpluginOptions } from 'unplugin';
import type { Options } from '../types';
import { cleanUnusedFiles } from './cleanUnusedFiles';
import { resolveOptions } from './resolveOptions';

export const pluginFactory: UnpluginFactory<Options | undefined> = (initialOptions: Options = {}) => {
  const options = resolveOptions(initialOptions);
  const { logger } = options;

  return {
    name: '@shellicar/build-clean',
    enforce: 'post',
    esbuild: {
      setup(build) {
        build.initialOptions.metafile = true;

        build.onEnd(async (result) => {
          logger.debug('Build completed, starting cleanup process');

          // A build that failed wrote nothing, so there is nothing to clean and
          // nothing useful to say. Its own errors are what the user needs to
          // read, and an error from here would sit on top of them.
          if (result.errors.length > 0) {
            logger.debug(`Build failed with ${result.errors.length} error(s), skipping cleanup`);
            return;
          }

          const outdir = build.initialOptions.outdir;
          if (!outdir) {
            throw new Error('[build-cleaner] No output directory specified in build options');
          }

          // The build succeeded, so this means something removed the metafile
          // option that setup turned on.
          if (!result.metafile) {
            throw new Error('[build-cleaner] No metafile available - ensure metafile is enabled');
          }

          const builtFiles = new Set(Object.keys(result.metafile.outputs));
          logger.debug(`Found ${builtFiles.size} built files in metafile for directory: "${outdir}"`);

          // Metafile paths are relative to esbuild's working directory, which
          // only defaults to the process one.
          const baseDir = build.initialOptions.absWorkingDir ?? process.cwd();
          logger.debug(`Base directory: "${baseDir}"`);

          await cleanUnusedFiles(outdir, builtFiles, baseDir, options);
        });
      },
    },
  } satisfies UnpluginOptions;
};
