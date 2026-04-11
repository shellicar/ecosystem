import type { GraphqlFile } from './types';

export const generateTypedefsFile = (files: GraphqlFile[]) => {
  const importStatements = files.map((f) => `import ${f.name} from '${f.path}';`);

  const documentsArray = `[${files.map((f) => f.name).join(', ')}]`;

  const code = [...importStatements, `export default ${documentsArray};`];
  return code.join('\n');
};
