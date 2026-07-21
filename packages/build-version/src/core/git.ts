import { execSync } from 'node:child_process';
import type { ILogger, VersionStrategy } from './types';

export type ExecCommand = (command: string) => string | null;

const createRealExecCommand = (logger: ILogger): ExecCommand => {
  return (command: string): string | null => {
    try {
      logger.debug(`Executing git command: ${command}`);
      const result = execSync(command, { encoding: 'utf8' }).trim();
      logger.debug(`Command result: ${result}`);
      return result;
    } catch (error) {
      logger.error(`Command failed: ${command}`);
      console.error(error);
      return null;
    }
  };
};

export const getPullRequestNumber = (branch: string): string | null => {
  const match = branch.match(/^(pull|pull-requests|pr)[/-](\d+)/);
  return match ? match[2].padStart(4, '0') : null;
};

// The tag-match pattern that scopes `git describe` to one package's own tags,
// so a monorepo commit carrying several packages' tags resolves to the right one.
export const buildTagMatchPattern = (packageName?: string): string => {
  return packageName ? `${packageName}@*` : '*';
};

export interface ParsedTag {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

// null means the matched tag isn't this package's own semver at all - e.g. no
// packageName was given and `git describe` picked a different package's tag in
// a monorepo. Callers must decline (not fabricate a 0.0.0 version) in that case.
export const parseTag = (tag: string, packageName?: string): ParsedTag | null => {
  const bare = packageName && tag.startsWith(`${packageName}@`) ? tag.slice(packageName.length + 1) : tag;
  const match = bare.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return null;
  }
  const [, major, minor, patch, prerelease] = match;
  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
    prerelease: prerelease ?? null,
  };
};

export interface GitStrategyOptions {
  packageName?: string;
}

export const createGitStrategy = (logger: ILogger, options: GitStrategyOptions = {}, exec: ExecCommand = createRealExecCommand(logger)): VersionStrategy => {
  const { packageName } = options;

  const getVersionInfo = (): (ParsedTag & { distance: number }) | null => {
    const pattern = buildTagMatchPattern(packageName);
    const describe = exec(`git describe --tags --long --match '${pattern}'`);
    if (!describe) {
      return null;
    }

    const match = describe.match(/^(.*)-(\d+)-g[0-9a-f]+$/);
    if (!match) {
      return null;
    }

    const parsed = parseTag(match[1], packageName);
    if (!parsed) {
      return null;
    }

    return { ...parsed, distance: Number.parseInt(match[2], 10) };
  };

  const sanitizeBranchName = (branch: string): string => {
    return branch.replace(/[^a-zA-Z0-9-]/g, '-');
  };

  // null means "this isn't a git working tree at all" (both lookups failed) -
  // distinct from "a git repo with no tags yet", which still answers below.
  const getBranchOrRef = (): string | null => {
    const currentBranch = exec('git branch --show-current');
    if (currentBranch) {
      return currentBranch;
    }

    const detachedHead = exec('git branch | grep "\\*"');
    if (!detachedHead) {
      return null;
    }

    const match = detachedHead.match(/HEAD detached at ([^)]+)/);
    return match ? match[1] : detachedHead;
  };

  return () => {
    const branch = getBranchOrRef();
    if (branch === null) {
      return null;
    }
    const info = getVersionInfo();
    if (info === null) {
      return null;
    }
    const { major, minor, patch, prerelease, distance } = info;

    let version: string;
    if (branch === 'main') {
      if (distance === 0) {
        // HEAD is the tagged release commit itself: report it exactly.
        version = prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`;
      } else {
        // main has moved past the last tag (no release yet for these commits):
        // keep counting from that tag rather than resetting to 0.0.0.
        const label = prerelease ?? 'dev';
        version = `${major}.${minor}.${patch}-${label}.${distance}`;
      }
      logger.debug('Using main branch version', { major, minor, patch, prerelease, distance, version });
    } else {
      const prNumber = getPullRequestNumber(branch);
      const sanitizedBranch = prNumber ? `PullRequest-${prNumber}` : sanitizeBranchName(branch);
      version = `${major}.${minor}.${patch}-${sanitizedBranch}.${distance}`;
      logger.debug('Using feature branch version', { branch, sanitizedBranch, distance, version });
    }
    return {
      version,
      branch,
    };
  };
};
