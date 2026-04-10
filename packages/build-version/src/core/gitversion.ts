import { execSync } from 'node:child_process';
import { platform } from 'node:os';
import type { Options, VersionCalculator } from './types';

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

const gitversionCalculator = (options: Options) => {
  const { strict = false } = options;
  const command = getGitVersionCommand();

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
      console.warn('⚠️ Using empty values for version information. Install GitVersion or disable strict mode.');

      return {
        version: '',
        branch: '',
      };
    }
    throw err;
  }
};

export const createGitversionCalculator = (options: Options): VersionCalculator => {
  return () => {
    return gitversionCalculator(options);
  };
};
