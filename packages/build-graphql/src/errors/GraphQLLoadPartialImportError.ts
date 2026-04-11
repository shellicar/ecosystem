import { GraphQLLoadError } from './GraphQLLoadError';

/**
 * Error thrown when not all GraphQL files that were found were imported.
 */
export class GraphQLLoadPartialImportError extends GraphQLLoadError {
  public readonly imported: number;
  public readonly matched: number;

  public constructor(imported: number, matched: number) {
    super('PartialImport');
    this.imported = imported;
    this.matched = matched;
  }
}
