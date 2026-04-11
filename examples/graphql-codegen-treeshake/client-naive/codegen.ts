import type { CodegenConfig } from '@graphql-codegen/cli';
import type { ClientPresetConfig } from '@graphql-codegen/client-preset';
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript';

const config: CodegenConfig = {
  schema: '../fixtures/schema.graphql',
  documents: ['src/**/*.graphql'],
  generates: {
    'src/generated/': {
      preset: 'client',
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
