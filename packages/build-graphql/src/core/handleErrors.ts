import { ErrorPolicy } from '../enums';
import { GraphQLLoadNoFilesError } from './../errors/GraphQLLoadNoFilesError';
import { GraphQLLoadPartialImportError } from './../errors/GraphQLLoadPartialImportError';
import { GraphQLLoadTypedefsMissingError } from './../errors/GraphQLLoadTypedefsMissingError';
import type { GlobPattern, ILogger } from '../types';
import { virtualModuleId } from './consts';

interface HandleErrorsOptions {
  graphqlMatched: number;
  graphqlImports: number;
  importedTypedefs: boolean;
  globPattern: GlobPattern;
}

const errorText = {
  NO_FILES_MATCHED: 'No GraphQL files found for the pattern',
  PARTIAL_IMPORT: 'Some GraphQL files were not imported',
  TYPEDEFS_MISSING: `Typedefs not imported. Make sure to import from ${virtualModuleId}`,
};

export function handleErrors(errorPolicy: ErrorPolicy, logger: ILogger, { graphqlMatched, graphqlImports, importedTypedefs, globPattern }: HandleErrorsOptions) {
  if (errorPolicy === ErrorPolicy.Ignore) {
    return;
  }

  if (graphqlMatched === 0) {
    if (errorPolicy === ErrorPolicy.Abort) {
      throw new GraphQLLoadNoFilesError(globPattern);
    }
    logger.error(errorText.NO_FILES_MATCHED, { globPattern });
  }

  if (graphqlImports !== graphqlMatched) {
    if (errorPolicy === ErrorPolicy.Abort) {
      throw new GraphQLLoadPartialImportError(graphqlImports, graphqlMatched);
    }
    logger.error(errorText.PARTIAL_IMPORT, { graphqlImports, graphqlMatched });
  }

  if (!importedTypedefs) {
    if (errorPolicy === ErrorPolicy.Abort) {
      throw new GraphQLLoadTypedefsMissingError();
    }
    logger.error(errorText.TYPEDEFS_MISSING);
  }
}
