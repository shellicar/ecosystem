import type { VersionStrategy } from './types';

// Last-resort strategy: never null, so a default strategy list always produces
// a result even outside a git working tree (e.g. an unpacked tarball).
export const createFallbackStrategy = (version: string): VersionStrategy => {
  return () => ({
    version,
    branch: 'unknown',
  });
};
