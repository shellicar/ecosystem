import type { GlobOptions, GlobOptionsWithFileTypesUnset, glob } from 'glob';
import type { DocumentNode } from 'graphql';
import type { ErrorPolicy, Feature } from './enums';

export type GlobPattern = Parameters<typeof glob>[0]; // string | string[]
export type GlobIgnore = NonNullable<GlobOptions['ignore']>; // string | string[] | IgnoreLike

export interface Options {
  /**
   * Glob pattern to search for graphql files
   */
  globPattern?: GlobPattern;

  /**
   * Compare function for sorting files.
   * @default localeCompare
   */
  compareFn?: (a: string, b: string) => number;

  /**
   * Glob ignore pattern for graphql files
   * @deprecated Use `globOptions.ignore` instead
   */
  globIgnore?: GlobIgnore;

  /**
   * Glob options to pass to the glob library
   */
  globOptions?: GlobOptionsWithFileTypesUnset;

  /**
   * Ignores errors, otherwise errors will be thrown if graphql files are not found/imported and the typedefs file is not found
   * @deprecated Use `errorPolicy` instead. true => ErrorPolicy.Abort
   */
  ignoreErrors?: boolean;

  /**
   * What action to take when errors are detected.
   * @default ErrorPolicy.Abort
   */
  errorPolicy?: ErrorPolicy;

  /**
   * Enable logging
   */
  debug?: boolean;

  /**
   * Features of the plugin. Disable if they are causing issues.
   */
  features?: Features;

  /**
   * Custom function to map the document node
   */
  mapDocumentNode?: (documentNode: DocumentNode) => DocumentNode;
}

export type LogLevel = 'debug' | 'error';

export type ILogger = {
  [key in LogLevel]: (typeof console)[key];
};

export type Features = Partial<Record<Feature, boolean>>;
