import type { GlobOptionsWithFileTypesUnset, glob } from 'glob';
import type { DocumentNode } from 'graphql';
import type { ErrorPolicy, Feature } from './enums';

export type GlobPattern = Parameters<typeof glob>[0]; // string | string[]

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
   * Glob options to pass to the glob library.
   * `ignore` defaults to ignoring every `node_modules` folder; setting it replaces the default (use `[]` to turn it off).
   */
  globOptions?: GlobOptionsWithFileTypesUnset;

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

export type Features = Partial<Record<Feature, boolean>>;
