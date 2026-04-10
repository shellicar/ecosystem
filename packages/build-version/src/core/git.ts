import { execSync } from 'node:child_process';
import type { ILogger, VersionCalculator } from './types';

const FALLBACK_VERSION = '0.1.0';

const createExecCommand = (logger: ILogger) => {
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

export const createGitCalculator = (logger: ILogger): VersionCalculator => {
  const execCommand = createExecCommand(logger);

  const getVersionInfo = (): { tag: string; distance: number } => {
    const describe = execCommand('git describe --tags --long');
    if (!describe) {
      return {
        tag: FALLBACK_VERSION,
        distance: 0,
      };
    }

    const match = describe.match(/^(.*)-(\d+)-g[0-9a-f]+$/);
    if (!match) {
      return {
        tag: FALLBACK_VERSION,
        distance: 0,
      };
    }

    return {
      tag: match[1],
      distance: Number.parseInt(match[2], 10),
    };
  };

  const sanitizeBranchName = (branch: string): string => {
    return branch.replace(/[^a-zA-Z0-9-]/g, '-');
  };

  const parseVersion = (tag: string): { major: number; minor: number; patch: number } => {
    const [major, minor = '0', patch = '0'] = tag.split('.');
    return {
      major: Number.parseInt(major, 10) || 0,
      minor: Number.parseInt(minor, 10) || 0,
      patch: Number.parseInt(patch, 10) || 0,
    };
  };

  const getBranchOrRef = (): string => {
    const currentBranch = execCommand('git branch --show-current');
    if (currentBranch) {
      return currentBranch;
    }

    const detachedHead = execCommand('git branch | grep "\\*"');
    if (!detachedHead) {
      return 'unknown';
    }

    const match = detachedHead.match(/HEAD detached at ([^)]+)/);
    return match ? match[1] : detachedHead;
  };

  return () => {
    const branch = getBranchOrRef();

    const { tag, distance } = getVersionInfo();

    let version: string;
    if (branch === 'main') {
      const { major, minor, patch } = parseVersion(tag);
      version = `${major}.${minor}.${patch + distance}`;
      logger.debug('Using main branch version', { major, minor, patch, distance, version });
    } else {
      const prNumber = getPullRequestNumber(branch);
      const sanitizedBranch = prNumber ? `PullRequest-${prNumber}` : sanitizeBranchName(branch);
      version = `${tag}-${sanitizedBranch}.${distance}`;
      logger.debug('Using feature branch version', { branch, sanitizedBranch, distance, version });
    }
    return {
      version,
      branch,
    };
  };
};
