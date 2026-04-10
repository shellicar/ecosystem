import { createUnplugin } from 'unplugin';
import { pluginFactory } from './pluginFactory';

export const plugin = createUnplugin(pluginFactory);
