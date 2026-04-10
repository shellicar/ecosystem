import '@nuxt/schema';
import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from '@nuxt/kit';
import unplugin from '.';
import type { Options } from './core/types';

export default defineNuxtModule({
  meta: {
    name: 'nuxt-build-version',
    configKey: 'buildVersion',
  },
  setup(options: Options) {
    addWebpackPlugin(unplugin.webpack(options));
    addVitePlugin(unplugin.vite(options));
  },
});
