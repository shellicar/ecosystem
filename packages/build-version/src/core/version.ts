import { execSync } from 'node:child_process';
import { createGitCalculator } from './git';
import { createGitversionCalculator } from './gitversion';
import type { ILogger, Options, VersionCalculator } from './types';

const execCommand = (command: string): string => {
  return execSync(command, { encoding: 'utf8' }).trim();
};

const getCalculator = (options: Options, logger: ILogger): VersionCalculator => {
  if (typeof options?.versionCalculator === 'function') {
    return options.versionCalculator;
  }

  switch (options.versionCalculator) {
    case 'git':
      return createGitCalculator(logger);
    default:
      return createGitversionCalculator(options);
  }
};

const generateVersionInfo = (calculator: VersionCalculator) => {
  const sha = execCommand('git rev-parse HEAD');
  const shortSha = sha.substring(0, 7);
  const commitDate = execCommand('git log -1 --format=%cI');

  const { version, branch } = calculator();

  return {
    buildDate: new Date().toISOString(),
    branch,
    sha,
    shortSha,
    commitDate,
    version,
  };
};

export const loadVirtualModule = (options: Options, logger: ILogger) => {
  const calculator = getCalculator(options, logger);
  const versionInfo = generateVersionInfo(calculator);
  logger.debug('Version info:', versionInfo);
  const json = JSON.stringify(versionInfo, null, 2);
  const code = `export default ${json}`;
  return code;
};
