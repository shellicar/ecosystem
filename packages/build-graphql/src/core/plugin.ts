import { createUnplugin } from 'unplugin';
import { graphqlPluginFactory } from './graphqlPluginFactory';

export const plugin = createUnplugin(graphqlPluginFactory);
