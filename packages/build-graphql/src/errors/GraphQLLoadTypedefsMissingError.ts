import { GraphQLLoadError } from './GraphQLLoadError';

/**
 * Error thrown when there was no import of the virtual typedefs export.
 */
export class GraphQLLoadTypedefsMissingError extends GraphQLLoadError {
  public constructor() {
    super('TypedefsMissing');
  }
}
