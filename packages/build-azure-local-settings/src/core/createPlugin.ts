import 'regexp.escape/auto';
import type { Plugin } from 'esbuild';
import { Feature } from '../enums';
import { BundlerNotConfiguredError } from '../errors/BundlerNotConfiguredError';
import { NodePlatformRequiredError } from '../errors/NodePlatformRequiredError';
import { pluginName, pluginNamespace } from './consts';
import { generateVirtualModule } from './generateVirtualModule';
import { getVirtualModuleId } from './getVirtualModuleId';
import { injectEntryPoint } from './injectEntryPoint';
import { resolveFormat } from './resolveFormat';
import type { ResolvedOptions } from './types';

export const createPlugin = (options: ResolvedOptions): Plugin => {
  const virtualModuleId = getVirtualModuleId(options.entryName);

  return {
    name: pluginName,
    setup(build) {
      if (!build.initialOptions.bundle) {
        throw new BundlerNotConfiguredError();
      }

      if (options.loadLocalSettings && build.initialOptions.platform !== 'node') {
        throw new NodePlatformRequiredError(build.initialOptions.platform);
      }

      const format = resolveFormat(build.initialOptions);

      // Add virtual entry point
      if (options.features[Feature.EsbuildEntryInjection]) {
        injectEntryPoint(build.initialOptions, options.entryName, virtualModuleId);
      }

      // Resolve virtual module
      const virtualModuleFilter = new RegExp(`^${RegExp.escape(virtualModuleId)}$`);
      build.onResolve({ filter: virtualModuleFilter }, (args) => ({
        path: args.path,
        namespace: pluginNamespace,
      }));

      // Load virtual module content
      const resolveDir = build.initialOptions.absWorkingDir ?? process.cwd();
      build.onLoad({ filter: /.*/, namespace: pluginNamespace }, () => ({
        contents: generateVirtualModule(options, format),
        loader: 'ts',
        resolveDir,
      }));
    },
  };
};
