import type { VersionStrategy } from './types';

// Highest-priority strategy: a CI job that already knows the exact version it's
// building (e.g. a release job publishing a specific tag) states it directly,
// bypassing git entirely.
export const createEnvOverrideStrategy = (env: NodeJS.ProcessEnv = process.env): VersionStrategy => {
  return () => {
    const version = env.BUILD_VERSION_OVERRIDE;
    if (!version) {
      return null;
    }
    return {
      version,
      branch: env.BUILD_BRANCH_OVERRIDE ?? '',
    };
  };
};
