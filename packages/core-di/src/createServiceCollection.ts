import { DefaultServiceCollectionOptions } from './defaults';
import type { IAsyncServiceCollection, IServiceCollection } from './interfaces';
import { ConsoleLogger } from './private/consoleLogger';
import { ServiceCollection } from './private/ServiceCollection';
import type { ServiceCollectionOptions } from './types';

/**
 * Options for {@link createServiceCollection}. `async: true` makes the builders
 * carry `usingAsync` and the collection `buildProviderAsync`.
 */
export type CreateServiceCollectionOptions<Async extends boolean = false> = Partial<ServiceCollectionOptions> & {
  readonly async?: Async;
};

const mergeOptions = (options: Partial<ServiceCollectionOptions> | undefined): ServiceCollectionOptions => ({
  ...DefaultServiceCollectionOptions,
  ...options,
});

/**
 * Creates a service collection with the (optionally) provided options
 * @param options - Optional configuration for the service collection.
 * @defaultValue Default options are taken from {@link DefaultServiceCollectionOptions}.
 */
export function createServiceCollection(options?: CreateServiceCollectionOptions<false>): IServiceCollection;
export function createServiceCollection(options: CreateServiceCollectionOptions<true>): IAsyncServiceCollection;
export function createServiceCollection(options?: CreateServiceCollectionOptions<boolean>): IServiceCollection | IAsyncServiceCollection {
  const mergedOptions = mergeOptions(options);
  const logger = mergedOptions.logger ?? new ConsoleLogger(mergedOptions);
  return new ServiceCollection(logger, mergedOptions, false, options?.async === true);
}
