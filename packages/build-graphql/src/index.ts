import type { GlobOptionsWithFileTypesUnset } from 'glob';
import { plugin } from './core/plugin';
import { ErrorPolicy, Feature } from './enums';
import { GraphQLLoadError, GraphQLLoadNoFilesError, GraphQLLoadPartialImportError, GraphQLLoadTypedefsMissingError, InvalidFeatureCombinationError } from './errors';
import type { Features, GlobIgnore, GlobPattern, ILogger, LogLevel, Options } from './types';

export type { Features, ILogger, LogLevel, GlobIgnore, GlobPattern, GlobOptionsWithFileTypesUnset, Options };
export { plugin as default };
export { Feature, ErrorPolicy };
export { GraphQLLoadError, GraphQLLoadNoFilesError, GraphQLLoadPartialImportError, GraphQLLoadTypedefsMissingError, InvalidFeatureCombinationError };
