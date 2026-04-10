import '@nuxt/schema';
import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from '@nuxt/kit';
import unplugin from '.';
import type { Options } from './types';

export default defineNuxtModule({
  meta: {
    name: 'nuxt-build-clean',
    configKey: 'buildVersion',
  },
  setup(options: Options) {
    addWebpackPlugin(unplugin.webpack(options));
    addVitePlugin(unplugin.vite(options));
  },
});
