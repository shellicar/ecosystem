import type { PluginBuild } from 'esbuild';
import { vi } from 'vitest';

export const makeBuild = () => {
  const build = {
    initialOptions: {},
    esbuild: {} as PluginBuild['esbuild'],

    onLoad: vi.fn<PluginBuild['onLoad']>(),
    onResolve: vi.fn<PluginBuild['onResolve']>(),
    onStart: vi.fn<PluginBuild['onStart']>(),
    onEnd: vi.fn<PluginBuild['onEnd']>(),
    onDispose: vi.fn<PluginBuild['onDispose']>(),
    resolve: vi.fn<PluginBuild['resolve']>(),
  };
  return build;
};
