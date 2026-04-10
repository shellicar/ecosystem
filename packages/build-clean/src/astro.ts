import { plugin } from './core/plugin';
import type { Options } from './types';

export default (options: Options): any => ({
  name: 'build-clean',
  hooks: {
    'astro:config:setup': async (astro: any) => {
      astro.config.vite.plugins ||= [];
      astro.config.vite.plugins.push(plugin.vite(options));
    },
  },
});
