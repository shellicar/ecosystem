import type { CodegenConfig } from '@graphql-codegen/cli';
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import { type ClientPresetConfig, preset } from '@shellicar/graphql-codegen-treeshake';

const config: CodegenConfig = {
  schema: '../../fixtures/schema.graphql',
  documents: ['src/**/*.graphql'],
  generates: {
    'src/generated/': {
      preset,
      presetConfig: {
        fragmentMasking: false,
      } satisfies ClientPresetConfig,
      config: {
        useTypeImports: true,
      } satisfies TypeScriptPluginConfig,
    },
  },
};

export default config;
