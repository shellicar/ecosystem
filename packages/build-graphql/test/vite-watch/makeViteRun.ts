import type { NormalizedInputOptions, PluginContext } from 'rollup';
import { createUnplugin } from 'unplugin';
import type { Plugin } from 'vite';
import { vi } from 'vitest';
import { ErrorPolicy, type Features } from '../../src';
import { virtualModuleId } from '../../src/core/consts';
import { graphqlPluginFactory } from '../../src/core/graphqlPluginFactory';
import { resolveVirtualId } from '../../src/core/resolveVirtualId';
import { getHandler } from './getHandler';

export const makeViteRun = (features: Features) => {
  const unplugin = createUnplugin(graphqlPluginFactory);
  const plugin = unplugin.vite({
    features,
    errorPolicy: ErrorPolicy.Ignore,
    ignoreErrors: true,
  }) as Plugin;

  const ctx = {
    cache: {} as PluginContext['cache'],
    fs: {} as PluginContext['fs'],
    meta: {} as PluginContext['meta'],
    environment: {} as PluginContext['environment'],

    addWatchFile: vi.fn(),
    debug: vi.fn(),
    emitFile: vi.fn(),
    error: vi.fn<PluginContext['error']>(),
    getFileName: vi.fn(),
    getModuleIds: vi.fn(),
    getModuleInfo: vi.fn(),
    getWatchFiles: vi.fn(),
    info: vi.fn(),
    load: vi.fn(),
    parse: vi.fn(),
    resolve: vi.fn(),
    setAssetSource: vi.fn(),
    warn: vi.fn(),
  };

  const module = resolveVirtualId(virtualModuleId);

  const normalizedInput = {} as unknown as NormalizedInputOptions;

  const runBuild = async () => {
    const buildStart = getHandler(plugin.buildStart);
    const load = getHandler(plugin.load);
    const buildEnd = getHandler(plugin.buildEnd);

    await buildStart?.call(ctx, normalizedInput);
    await load?.call(ctx, module);
    await buildEnd?.call(ctx);
  };

  return { plugin, ctx, runBuild };
};
