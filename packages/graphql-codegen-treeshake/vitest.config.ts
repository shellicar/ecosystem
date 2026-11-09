import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Node loads graphql's CommonJS build for the codegen packages, so the tests use the same build.
    alias: [{ find: /^graphql$/, replacement: 'graphql/index.js' }],
  },
  test: {
    include: ['test/**/*.spec.ts'],
  },
});
