import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import type { VersionStrategy } from './types';

const getGitVersionCommand = (): string => {
  const os = platform();
  switch (os) {
    case 'win32': {
      return 'dotnet-gitversion.exe';
    }
    default: {
      return 'gitversion';
    }
  }
};

export interface GitversionStrategyOptions {
  strict?: boolean;
}

export const createGitversionStrategy = (options: GitversionStrategyOptions = {}): VersionStrategy => {
  const { strict = false } = options;
  const command = getGitVersionCommand();

  return () => {
    try {
      const version = execSync(`${command} -showvariable SemVer`, { encoding: 'utf8' }).trim();
      const branch = execSync(`${command} -showvariable BranchName`, { encoding: 'utf8' }).trim();
      return {
        version,
        branch,
      };
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = `Failed to run GitVersion: ${err.message}`;
        if (strict) {
          throw new Error(errorMessage);
        }
        console.warn(`⚠️ ${errorMessage}`);
        console.warn('⚠️ Skipping GitVersion strategy and falling through to the next one.');
        return null;
      }
      throw err;
    }
  };
};
