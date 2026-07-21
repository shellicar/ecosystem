import type { Options } from '@shellicar/build-version/types';
import { Strategies } from '@shellicar/build-version/types';
import VersionPlugin from '@shellicar/build-version/vite';
import { defineConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';

const strategy = process.env.CI ? Strategies.git() : Strategies.gitversion();

const options: Options = {
  debug: true,
  strategies: [strategy, Strategies.fallback('0.1.0')],
  strict: Boolean(process.env.CI),
};

export default defineConfig({
  clearScreen: false,
  plugins: [Inspect(), VersionPlugin(options)],
});
