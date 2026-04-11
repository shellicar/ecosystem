import path from 'node:path';
import { findFiles } from '../findFiles';
import type { ResolvedOptions } from '../types';
import type { GraphqlFile } from './types';

export const findGraphQLFiles = async (options: ResolvedOptions): Promise<GraphqlFile[]> => {
  const files = await findFiles(options);

  return files.map((file, index) => ({
    path: path.join(process.cwd(), file).replace(/\\/g, '/'),
    name: `gql_${index}`,
  }));
};
