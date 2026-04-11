import { inspect } from 'node:util';
import type { ILogger, LogLevel, Options } from '../types';

export const createLogger = (options: Options): ILogger => {
  const format = (message: unknown): unknown => (typeof message === 'object' ? inspect(message, { depth: null, colors: true }) : message);

  const createLogMethod =
    (level: LogLevel) =>
    (...args: unknown[]) => {
      if (args.length > 0) {
        const message = format(args[0]);
        const optionalParams = args.slice(1);
        console[level]('[graphql]', message, ...optionalParams);
      } else {
        console[level]('[graphql]');
      }
    };

  return {
    debug: options.debug ? createLogMethod('debug') : () => {},
    error: createLogMethod('error'),
  };
};
