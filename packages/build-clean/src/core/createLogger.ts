import { inspect } from 'node:util';
import type { ILogger } from '../types';

export interface LoggerOptions {
  prefix: string;
  debug?: boolean;
  verbose?: boolean;
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const format = (value: unknown): unknown => (typeof value === 'object' ? inspect(value, { depth: null, colors: true }) : value);

export function createLogger(options: LoggerOptions): ILogger {
  const prefix = `[${options.prefix}]`;

  const createLogMethod = (level: LogLevel, color: string, abbrev: string, enabled = true) =>
    enabled
      ? (message: string, ...args: unknown[]) => {
          console[level](`${color}${prefix} ${abbrev}${colors.reset}`, format(message), ...args);
        }
      : () => {};

  return {
    verbose: createLogMethod('debug', colors.blue, 'VERB', options.verbose),
    debug: createLogMethod('debug', colors.gray, 'DEBG', options.debug),
    info: createLogMethod('info', colors.green, 'INFO'),
    warn: createLogMethod('warn', colors.yellow, 'WARN'),
    error: createLogMethod('error', colors.red, 'EROR'),
  };
}
