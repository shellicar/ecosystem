import { VersionStrategyKind } from './types';
import type { CustomStrategyDescriptor, EnvOverrideStrategyDescriptor, FallbackStrategyDescriptor, GitStrategyDescriptor, GitVersionStrategyDescriptor, VersionStrategy } from './types';

// Descriptors only - no logger/exec here. Those are only available once
// build-version is actually running, so resolveStrategy wires them in later.
export const Strategies = {
  envOverride: (): EnvOverrideStrategyDescriptor => ({
    kind: VersionStrategyKind.EnvOverride,
  }),
  git: (options: { packageName?: string } = {}): GitStrategyDescriptor => ({
    kind: VersionStrategyKind.Git,
    packageName: options.packageName,
  }),
  gitversion: (options: { strict?: boolean } = {}): GitVersionStrategyDescriptor => ({
    kind: VersionStrategyKind.GitVersion,
    strict: options.strict,
  }),
  fallback: (version: string): FallbackStrategyDescriptor => ({
    kind: VersionStrategyKind.Fallback,
    version,
  }),
  custom: (strategy: VersionStrategy): CustomStrategyDescriptor => ({
    kind: VersionStrategyKind.Custom,
    strategy,
  }),
};
