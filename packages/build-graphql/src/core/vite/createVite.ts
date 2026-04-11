import type { UnpluginOptions } from 'unplugin';
import { Feature } from '../../enums';
import { InvalidFeatureCombinationError } from '../../errors/InvalidFeatureCombinationError';
import type { ILogger } from '../../types';
import type { ResolvedOptions } from '../types';
import { handleHotUpdate } from './viteHotUpdate';

export const createVite = (options: ResolvedOptions, logger: ILogger): UnpluginOptions['vite'] => {
  if (options.features[Feature.ViteHmr]) {
    if (!options.features[Feature.ViteWatch]) {
      throw new InvalidFeatureCombinationError(Feature.ViteHmr, Feature.ViteWatch);
    }
    logger.debug('Creating Vite HMR handling');
    return {
      handleHotUpdate,
    };
  }
  return undefined;
};
