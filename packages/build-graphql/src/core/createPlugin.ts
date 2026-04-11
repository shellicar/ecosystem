import type { UnpluginOptions } from 'unplugin';
import type { ILogger } from '../types';
import { pluginName, virtualModuleId } from './consts';
import { findFiles } from './findFiles';
import { loadGraphqlModule } from './graphql/loadGraphqlModule';
import { loadVirtualModule } from './graphql/loadVirtualModule';
import { handleErrors } from './handleErrors';
import { resolveVirtualId } from './resolveVirtualId';
import type { ResolvedOptions } from './types';

type Features = {
  esbuild: UnpluginOptions['esbuild'];
  vite: UnpluginOptions['vite'];
};

export const createPlugin = (features: Features, options: ResolvedOptions, logger: ILogger): UnpluginOptions => {
  let importedTypedefs = false;
  const graphqlImports: string[] = [];
  let graphqlMatched: string[] = [];

  return {
    name: pluginName,
    enforce: 'pre',

    ...features,

    async buildStart() {
      importedTypedefs = false;
      graphqlImports.length = 0;
      graphqlMatched = await findFiles(options);
      logger.debug('Matched GraphQL files:', graphqlMatched);
    },

    resolveId(id) {
      if (id === virtualModuleId || id.endsWith('.graphql')) {
        return resolveVirtualId(id);
      }
    },

    async load(id) {
      if (id === resolveVirtualId(virtualModuleId)) {
        importedTypedefs = true;

        if (options.features.VITE_WATCH) {
          const files = await findFiles(options);
          for (const f of files) {
            this.addWatchFile(f);
          }
        }

        return await loadVirtualModule(options, logger);
      }

      const result = await loadGraphqlModule(id, options);
      if (result !== undefined) {
        graphqlImports.push(id);
        return result;
      }
    },

    buildEnd() {
      logger.debug('Build end', {
        graphqlMatched,
        graphqlImports,
        importedTypedefs,
      });

      handleErrors(options.errorPolicy, logger, {
        graphqlMatched: graphqlMatched.length,
        graphqlImports: graphqlImports.length,
        importedTypedefs,
        globPattern: options.globPattern,
      });
    },
  } satisfies UnpluginOptions;
};
