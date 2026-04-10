export type VersionCalculator = () => { version: string; branch: string };

export type VersionCalculatorType = 'gitversion' | 'git' | VersionCalculator;

export interface Options {
  /**
   * Version calculator configuration
   * @default 'gitversion'
   */
  versionCalculator?: VersionCalculatorType;
  debug?: boolean;
  /**
   * When true, errors will be thrown if versioning fails
   * When false, errors will be logged and empty values will be returned
   * @default false
   */
  strict?: boolean;
}

export interface VersionInfo {
  buildDate: string;
  branch: string;
  sha: string;
  shortSha: string;
  commitDate: string;
  version: string;
}

export type ILogger = {
  debug: (typeof console)['debug'];
  error: (typeof console)['error'];
};
