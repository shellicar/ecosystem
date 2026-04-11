import { LogLevel, ResolveMultipleMode } from './enums';
import type { ServiceCollectionOptions } from './types';

export const DefaultServiceCollectionOptions: ServiceCollectionOptions = {
  registrationMode: ResolveMultipleMode.Error,
  logLevel: LogLevel.Warn,
};
