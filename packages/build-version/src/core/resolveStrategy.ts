import { createEnvOverrideStrategy } from './envOverride';
import { createFallbackStrategy } from './fallback';
import { createGitStrategy } from './git';
import { createGitversionStrategy } from './gitversion';
import type { ILogger, VersionStrategy, VersionStrategyDescriptor } from './types';
import { VersionStrategyKind } from './types';

// The only place that turns a descriptor (built by Strategies.*, carrying only
// config) into a callable VersionStrategy, wiring in the logger that isn't
// available until build-version is actually running.
export const resolveStrategy = (descriptor: VersionStrategyDescriptor, logger: ILogger): VersionStrategy => {
  switch (descriptor.kind) {
    case VersionStrategyKind.EnvOverride:
      return createEnvOverrideStrategy();
    case VersionStrategyKind.Git:
      return createGitStrategy(logger, { packageName: descriptor.packageName });
    case VersionStrategyKind.GitVersion:
      return createGitversionStrategy({ strict: descriptor.strict });
    case VersionStrategyKind.Fallback:
      return createFallbackStrategy(descriptor.version);
    case VersionStrategyKind.Custom:
      return descriptor.strategy;
  }
};
