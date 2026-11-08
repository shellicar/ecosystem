import type { Types } from '@graphql-codegen/plugin-helpers';
import { buildSchema, parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { preset } from '../src';

const schemaSource = `
  scalar DateTime
  enum Rank { APPRENTICE ADEPT }
  type Wizard { name: String! rank: Rank! createdAt: DateTime! }
  type Query { wizard: Wizard }
`;

const documentSource = 'query GetWizard { wizard { name rank createdAt } }';

const buildOptions = (config: Record<string, unknown>): Types.PresetFnArgs<Record<string, unknown>> => {
  const schemaAst = buildSchema(schemaSource);
  return {
    baseOutputDir: 'src/generated/',
    plugins: [],
    pluginMap: {},
    schema: parse(schemaSource),
    schemaAst,
    documents: [{ document: parse(documentSource), location: 'requests.graphql' }],
    config,
    presetConfig: { fragmentMasking: false },
    documentTransforms: [],
  };
};

const graphqlFileConfig = async (config: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const generates = await preset.buildGeneratesSection(buildOptions(config));
  const graphqlFile = generates.find((generate) => generate.filename.endsWith('graphql.ts'));
  return graphqlFile?.config ?? {};
};

describe('preset defaults', () => {
  it('generates enums as TypeScript enums by default', async () => {
    const expected = 'native';
    const actual = (await graphqlFileConfig({})).enumType;

    expect(actual).toBe(expected);
  });

  it('types custom scalars as any by default', async () => {
    const expected = 'any';
    const actual = (await graphqlFileConfig({})).defaultScalarType;

    expect(actual).toBe(expected);
  });
});

describe('consumer config', () => {
  it('overrides the enumType default', async () => {
    const expected = 'string-literal';
    const actual = (await graphqlFileConfig({ enumType: 'string-literal' })).enumType;

    expect(actual).toBe(expected);
  });

  it('overrides the defaultScalarType default', async () => {
    const expected = 'unknown';
    const actual = (await graphqlFileConfig({ defaultScalarType: 'unknown' })).defaultScalarType;

    expect(actual).toBe(expected);
  });

  it('keeps settings the preset has no default for', async () => {
    const expected = true;
    const actual = (await graphqlFileConfig({ useTypeImports: true })).useTypeImports;

    expect(actual).toBe(expected);
  });
});
