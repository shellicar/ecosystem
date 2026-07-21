import { execSync } from 'node:child_process';
import { resolveStrategy } from './resolveStrategy';
import { Strategies } from './strategies';
import type { ILogger, Options, VersionStrategy, VersionStrategyDescriptor } from './types';

const execCommand = (command: string): string => {
  return execSync(command, { encoding: 'utf8' }).trim();
};

// gitversion before git: both need a working tree, so once git has declined
// (no working tree at all) gitversion can't succeed either. Trying gitversion
// first gives it a real fallthrough case - its own CLI not being installed -
// distinct from "no git repo", which git then catches without any external binary.
const defaultDescriptors = (options: Options): VersionStrategyDescriptor[] => [Strategies.envOverride(), Strategies.gitversion(), Strategies.git({ packageName: options.packageName }), Strategies.fallback('0.1.0')];

export const getStrategies = (options: Options, logger: ILogger): VersionStrategy[] => {
  const descriptors = options.strategies ?? defaultDescriptors(options);
  return descriptors.map((descriptor) => resolveStrategy(descriptor, logger));
};

export const runStrategies = (strategies: VersionStrategy[]): { version: string; branch: string } => {
  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      return result;
    }
  }
  throw new Error('No version strategy produced a result');
};

const generateVersionInfo = (strategies: VersionStrategy[]) => {
  const sha = execCommand('git rev-parse HEAD');
  const shortSha = sha.substring(0, 7);
  const commitDate = execCommand('git log -1 --format=%cI');

  const { version, branch } = runStrategies(strategies);

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
  const strategies = getStrategies(options, logger);
  const versionInfo = generateVersionInfo(strategies);
  logger.debug('Version info:', versionInfo);
  const json = JSON.stringify(versionInfo, null, 2);
  const code = `export default ${json}`;
  return code;
};
