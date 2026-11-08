import { preset as clientPreset } from '@graphql-codegen/client-preset';
import type { Types } from '@graphql-codegen/plugin-helpers';
import { defaultConfig } from './defaultConfig.js';
import { plugin as reachableTypesPlugin } from './plugin.js';

export const reachableTypesPreset: Types.OutputPreset = {
  prepareDocuments: clientPreset.prepareDocuments,
  buildGeneratesSection: async (options) => {
    const generates = await clientPreset.buildGeneratesSection({
      ...options,
      config: { ...defaultConfig, ...options.config },
    });
    return generates.map((generate) => ({
      ...generate,
      pluginMap: {
        ...generate.pluginMap,
        typescript: { plugin: reachableTypesPlugin },
      },
    }));
  },
};
