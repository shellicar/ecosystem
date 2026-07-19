import { CaptivePolicy, LogLevel, ResolveMultipleMode, RuntimeCaptivePolicy } from '@shellicar/core-di-engine';
import type { ServiceCollectionOptions } from './types';

export const DefaultServiceCollectionOptions: ServiceCollectionOptions = {
  registrationMode: ResolveMultipleMode.Error,
  logLevel: LogLevel.Warn,
  captivePolicy: CaptivePolicy.Disposal,
  runtimeCaptivePolicy: RuntimeCaptivePolicy.None,
};
