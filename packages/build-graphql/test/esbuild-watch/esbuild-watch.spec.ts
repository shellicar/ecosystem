import { describe, expect, it } from 'vitest';
import { Feature, type Options } from '../../src';
import { runEsbuildSetup } from './runEsbuildSetup';

describe('esbuild watch feature', () => {
  describe('source file imports virtual typedefs module', () => {
    describe('EsbuildWatch OFF', () => {
      it('does not expose an esbuild.setup hook', () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: false },
        };

        const build = runEsbuildSetup(options);

        const actual = build.onLoad;
        const expectedCalls = 0;

        expect(actual).toHaveBeenCalledTimes(expectedCalls);
      });

      it('esbuildSetup/onLoad does not return watchFiles', async () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: true },
        };

        const build = runEsbuildSetup(options);

        const onLoadCallback = build.onLoad.mock.calls[0][1];

        const result = await onLoadCallback({
          path: 'test/no-typedefs-entry.ts',
          namespace: 'file',
          suffix: '',
          pluginData: {},
          with: {},
        });
        const actual = result?.watchFiles;
        const expected = undefined;

        expect(actual).toBe(expected);
      });
    });

    describe('EsbuildWatch ON', () => {
      it('exposes an esbuild.setup hook', () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: true },
        };

        const build = runEsbuildSetup(options);

        const actual = build.onLoad;
        const expectedCalls = 1;

        expect(actual).toHaveBeenCalledTimes(expectedCalls);
      });

      it('esbuildSetup/onLoad returns watchFiles for matched GraphQL files', async () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: true },
        };

        const build = runEsbuildSetup(options);

        const onLoadCallback = build.onLoad.mock.calls[0][1];

        const result = await onLoadCallback({
          path: 'test/typedefs-entry.ts',
          namespace: 'file',
          suffix: '',
          pluginData: {},
          with: {},
        });

        const actual = result?.watchFiles;
        const expected = ['test/mutation.graphql', 'test/query.graphql', 'test/schema.spec.graphql', 'test/sub/schema.graphql'];

        expect(actual).toEqual(expected);
      });
    });
  });

  describe('source file does NOT import virtual typedefs module', () => {
    describe('EsbuildWatch OFF', () => {
      it('does not expose an esbuild.setup hook', () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: false },
        };

        const build = runEsbuildSetup(options);

        const actual = build.onLoad;
        const expectedCalls = 0;

        expect(actual).toHaveBeenCalledTimes(expectedCalls);
      });

      it('esbuildSetup/onLoad does not return watchFiles', async () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: true },
        };

        const build = runEsbuildSetup(options);

        const onLoadCallback = build.onLoad.mock.calls[0][1];

        const result = await onLoadCallback({
          path: 'test/no-typedefs-entry.ts',
          namespace: 'file',
          suffix: '',
          pluginData: {},
          with: {},
        });
        const actual = result?.watchFiles;
        const expected = undefined;

        expect(actual).toBe(expected);
      });
    });

    describe('EsbuildWatch ON', () => {
      it('exposes an esbuild.setup hook', () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: true },
        };

        const build = runEsbuildSetup(options);
        const actual = build.onLoad;
        const expectedCalls = 1;

        expect(actual).toHaveBeenCalledTimes(expectedCalls);
      });

      it('esbuildSetup/onLoad does not return watchFiles', async () => {
        const options: Options = {
          features: { [Feature.EsbuildWatch]: true },
        };

        const build = runEsbuildSetup(options);

        const onLoadCallback = build.onLoad.mock.calls[0][1];

        const result = await onLoadCallback({
          path: 'test/no-typedefs-entry.ts',
          namespace: 'file',
          suffix: '',
          pluginData: {},
          with: {},
        });
        const actual = result?.watchFiles;
        const expected = undefined;

        expect(actual).toBe(expected);
      });
    });
  });
});
