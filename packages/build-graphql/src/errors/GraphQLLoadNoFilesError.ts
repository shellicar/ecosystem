import type { GlobPattern } from '../types';
import { GraphQLLoadError } from './GraphQLLoadError';

/**
 * Error thrown when no GraphQL files were found.
 */
export class GraphQLLoadNoFilesError extends GraphQLLoadError {
  public readonly pattern: GlobPattern;

  public constructor(pattern: GlobPattern) {
    super('NoFilesMatched');
    this.pattern = pattern;
  }
}
