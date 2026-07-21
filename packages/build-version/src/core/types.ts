export type VersionStrategy = () => { version: string; branch: string } | null;

export enum VersionStrategyKind {
  EnvOverride = 'envOverride',
  Git = 'git',
  GitVersion = 'gitversion',
  Fallback = 'fallback',
  Custom = 'custom',
}

export interface EnvOverrideStrategyDescriptor {
  kind: VersionStrategyKind.EnvOverride;
}

export interface GitStrategyDescriptor {
  kind: VersionStrategyKind.Git;
  /**
   * Package name used to select this package's own tag (e.g. `<packageName>@<version>`)
   * out of several tags that can share a commit in a monorepo.
   */
  packageName?: string;
}

export interface GitVersionStrategyDescriptor {
  kind: VersionStrategyKind.GitVersion;
  strict?: boolean;
}

export interface FallbackStrategyDescriptor {
  kind: VersionStrategyKind.Fallback;
  version: string;
}

export interface CustomStrategyDescriptor {
  kind: VersionStrategyKind.Custom;
  strategy: VersionStrategy;
}

export type VersionStrategyDescriptor = EnvOverrideStrategyDescriptor | GitStrategyDescriptor | GitVersionStrategyDescriptor | FallbackStrategyDescriptor | CustomStrategyDescriptor;

export interface Options {
  /**
   * Package name used to select this package's own tag out of several sharing a commit.
   * Only used to build the default git strategy; ignored when `strategies` is supplied.
   */
  packageName?: string;
  /**
   * Ordered list of strategy descriptors to try; the first one to return a non-null result wins.
   * Overrides the built-in default list entirely.
   * @default [Strategies.envOverride(), Strategies.gitversion(), Strategies.git({ packageName }), Strategies.fallback('0.1.0')]
   */
  strategies?: VersionStrategyDescriptor[];
  debug?: boolean;
  /**
   * When true, a strategy that fails throws instead of being skipped in favour of the next one.
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
