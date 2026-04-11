import { generateContentsFromGraphqlString, generateGraphQLString } from '@luckycatfactory/esbuild-graphql-loader';
import type { DocumentNode } from 'graphql';
import type { TransformResult } from './types';

export const loadGraphqlModule = async (id: string, options: { mapDocumentNode?: (documentNode: DocumentNode) => DocumentNode }): Promise<TransformResult> => {
  if (id.startsWith('\0') && id.endsWith('.graphql')) {
    const realId = id.slice(1);
    const graphqlString = await generateGraphQLString(realId);
    const code = generateContentsFromGraphqlString(graphqlString, options.mapDocumentNode);
    return {
      code,
      map: null,
    };
  }
  return undefined;
};
