import type { Options } from '@shellicar/build-graphql/types';
import GraphQLPlugin from '@shellicar/build-graphql/vite';
import { defineConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';

const options: Options = {
  globPattern: '../**/*.graphql',
  debug: true,
};

export default defineConfig({
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [Inspect(), GraphQLPlugin(options)],
});
