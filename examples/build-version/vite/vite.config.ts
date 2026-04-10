import type { Options } from '@shellicar/build-version/types';
import VersionPlugin from '@shellicar/build-version/vite';
import { defineConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';

const versionCalculator = process.env.CI ? 'git' : 'gitversion';

const options: Options = {
  debug: true,
  versionCalculator,
  strict: Boolean(process.env.CI),
};

export default defineConfig({
  clearScreen: false,
  plugins: [Inspect(), VersionPlugin(options)],
});
