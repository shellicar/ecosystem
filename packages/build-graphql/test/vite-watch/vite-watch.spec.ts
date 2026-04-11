import type { ModuleNode } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import { Feature } from '../../src';
import { virtualModuleId } from '../../src/core/consts';
import { resolveVirtualId } from '../../src/core/resolveVirtualId';
import { handleHotUpdate } from '../../src/core/vite/viteHotUpdate';
import { InvalidFeatureCombinationError } from '../../src/errors/InvalidFeatureCombinationError';
import { expectToThrowErrorWithFields } from './expectToThrowErrorWithFields';
import { makeViteRun } from './makeViteRun';

const makeServer = () => {
  const moduleGraph = {
    getModuleById: vi.fn(),
    invalidateModule: vi.fn(),
  };

  return {
    moduleGraph,
  };
};

describe('vite watch/hmr features', () => {
  describe('ViteWatch OFF', () => {
    describe('ViteHmr OFF', () => {
      it('[ViteWatch=OFF][ViteHmr=OFF] supports running without watch or HMR', () => {
        const features = {
          [Feature.ViteWatch]: false,
          [Feature.ViteHmr]: false,
        };

        const actual = () => makeViteRun(features);
        expect(actual).not.toThrow();
      });

      it('[ViteWatch=OFF][ViteHmr=OFF] does not enable HMR integration', () => {
        const features = {
          [Feature.ViteWatch]: false,
          [Feature.ViteHmr]: false,
        };

        const { plugin } = makeViteRun(features);
        const actual = plugin.handleHotUpdate;
        const expected = undefined;

        expect(actual).toBe(expected);
      });

      it('[ViteWatch=OFF][ViteHmr=OFF] typedefs load does not register GraphQL files for watching', async () => {
        const features = {
          [Feature.ViteWatch]: false,
          [Feature.ViteHmr]: false,
        };
        const { ctx, runBuild } = makeViteRun(features);

        await runBuild();
        const actual = ctx.addWatchFile;
        const expectedCalls = 0;

        expect(actual).toBeCalledTimes(expectedCalls);
      });
    });

    describe('ViteHmr ON', () => {
      it('[ViteWatch=OFF][ViteHmr=ON] rejects invalid feature combination', () => {
        const features = {
          [Feature.ViteWatch]: false,
          [Feature.ViteHmr]: true,
        };

        const actual = () => makeViteRun(features);
        const errorType = InvalidFeatureCombinationError;
        const expected = {
          feature: Feature.ViteHmr,
          requires: Feature.ViteWatch,
        };

        expectToThrowErrorWithFields(actual, errorType, expected);
      });
    });
  });

  describe('ViteWatch ON', () => {
    describe('ViteHmr OFF', () => {
      it('[ViteWatch=ON][ViteHmr=OFF] supports watch without HMR', () => {
        const features = {
          [Feature.ViteWatch]: true,
          [Feature.ViteHmr]: false,
        };

        const actual = () => makeViteRun(features);
        expect(actual).not.toThrow();
      });

      it('[ViteWatch=ON][ViteHmr=OFF] does not enable HMR integration', () => {
        const features = {
          [Feature.ViteWatch]: true,
          [Feature.ViteHmr]: false,
        };

        const { plugin } = makeViteRun(features);
        const actual = plugin.handleHotUpdate;
        const expected = undefined;

        expect(actual).toBe(expected);
      });

      it('[ViteWatch=ON][ViteHmr=OFF] typedefs load registers all matched GraphQL files for watching', async () => {
        const features = {
          [Feature.ViteWatch]: true,
          [Feature.ViteHmr]: false,
        };

        const { ctx, runBuild } = makeViteRun(features);
        await runBuild();

        const actual = ctx.addWatchFile.mock.calls.map(([p]) => p);
        const expected = ['test/mutation.graphql', 'test/query.graphql', 'test/schema.spec.graphql', 'test/sub/schema.graphql'];

        expect(actual).toEqual(expected);
      });
    });

    describe('ViteHmr ON', () => {
      it('[ViteWatch=ON][ViteHmr=ON] supports watch with HMR', () => {
        const features = {
          [Feature.ViteWatch]: true,
          [Feature.ViteHmr]: true,
        };

        const actual = () => makeViteRun(features);
        expect(actual).not.toThrow();
      });

      it('[ViteWatch=ON][ViteHmr=ON] enables HMR integration', () => {
        const features = {
          [Feature.ViteWatch]: true,
          [Feature.ViteHmr]: true,
        };

        const { plugin } = makeViteRun(features);
        const actual = plugin.handleHotUpdate;
        const actualType = 'function';

        expect(actual).toBeTypeOf(actualType);
      });

      it('[ViteWatch=ON][ViteHmr=ON] typedefs load registers all matched GraphQL files for watching', async () => {
        const features = {
          [Feature.ViteWatch]: true,
          [Feature.ViteHmr]: true,
        };

        const { ctx, runBuild } = makeViteRun(features);
        await runBuild();

        const actual = ctx.addWatchFile.mock.calls.map(([p]) => p);
        const expected = ['test/mutation.graphql', 'test/query.graphql', 'test/schema.spec.graphql', 'test/sub/schema.graphql'];

        expect(actual).toEqual(expected);
      });

      describe('vite.handleHotUpdate', () => {
        describe('[ViteWatch=ON][ViteHmr=ON] for non-graphql changes', async () => {
          const server = makeServer();
          const result = await handleHotUpdate({ file: 'src/index.ts', server });

          it('does not interact with the module graph', () => {
            const actual = server.moduleGraph.getModuleById;
            const expectedCalls = 0;

            expect(actual).toHaveBeenCalledTimes(expectedCalls);
          });

          it('does not invalidate any modules', () => {
            const actual = server.moduleGraph.invalidateModule;
            const expectedCalls = 0;

            expect(actual).toHaveBeenCalledTimes(expectedCalls);
          });

          it('produces no hot-update result', () => {
            const actual = result;
            const expected = undefined;

            expect(actual).toBe(expected);
          });
        });

        describe('[ViteWatch=ON][ViteHmr=ON] for graphql changes when the module is present', async () => {
          const server = makeServer();
          const filename = 'test/query.graphql';
          const virtualId = resolveVirtualId(filename);
          const gqlModule = { id: virtualId };

          server.moduleGraph.getModuleById.mockImplementation((id) => (id === virtualId ? gqlModule : null));

          await handleHotUpdate({
            file: filename,
            server,
          });

          it('invalidates the changed graphql module', () => {
            const actual = server.moduleGraph.invalidateModule;
            const expected = gqlModule;

            expect(actual).toHaveBeenCalledWith(expected);
          });
        });

        describe('[ViteWatch=ON][ViteHmr=ON] for graphql changes when typedefs module is present', async () => {
          const server = makeServer();
          const filename = 'test/query.graphql';
          const virtualId = resolveVirtualId(virtualModuleId);
          const typedefsModule = { id: 'virtual:typedefs' };

          server.moduleGraph.getModuleById.mockImplementation((id) => (id === virtualId ? typedefsModule : null));

          const result = await handleHotUpdate({
            file: filename,
            server,
          });

          it('invalidates the typedefs virtual module', () => {
            const actual = server.moduleGraph.invalidateModule;
            const expected = typedefsModule;

            expect(actual).toHaveBeenCalledWith(expected);
          });

          it('requests a typedefs module reload', () => {
            const expected = [typedefsModule];
            const actual = result;

            expect(actual).toEqual(expected);
          });
        });

        describe('[ViteWatch=ON][ViteHmr=ON] for graphql changes when no relevant modules are present', async () => {
          const server = makeServer();
          server.moduleGraph.getModuleById.mockReturnValue(null);

          const result = await handleHotUpdate({
            file: 'test/query.graphql',
            server,
          });

          it('does not invalidate anything', () => {
            const actual = server.moduleGraph.invalidateModule;
            const expectedCalls = 0;

            expect(actual).toHaveBeenCalledTimes(expectedCalls);
          });

          it('does not request any module reloads', () => {
            const actual = result;
            const expected: ModuleNode[] = [];

            expect(actual).toEqual(expected);
          });
        });
      });
    });
  });
});
