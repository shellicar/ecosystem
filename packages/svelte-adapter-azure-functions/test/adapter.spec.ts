import type { Builder } from '@sveltejs/kit';
import type { BuildOptions, BuildResult } from 'esbuild';
import { build } from 'esbuild';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { createAdapter } from '../src/adapter';

vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}));

vi.mock('esbuild', () => ({
  build: vi.fn(() => Promise.resolve()),
}));

type LogMethods = 'success' | 'error' | 'warn' | 'minor' | 'info';
const getMockBuilder = () => {
  const log = vi.fn() as Mock & Record<LogMethods, Mock>;
  log.minor = vi.fn();
  log.warn = vi.fn();
  log.info = vi.fn();

  return {
    log,
    copy: vi.fn(),
    generateManifest: vi.fn(() => '{}'),
    getBuildDirectory: vi.fn((name: string) => `build/${name}`),
    getServerDirectory: vi.fn(() => 'server'),
    rimraf: vi.fn(),
    writeClient: vi.fn(),
    writePrerendered: vi.fn(),
  } as unknown as Builder;
};

describe('adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates valid adapter', () => {
    const adapter = createAdapter();
    expect(adapter.name).toBe('adapter-azure-functions');
  });

  it('calls esbuild', async () => {
    const adapter = createAdapter();
    const builder = getMockBuilder();

    await adapter.adapt(builder);

    expect(build).toHaveBeenCalledOnce();
  });

  it('calls esbuild with options #1', async () => {
    const expected = {
      minify: false,
    };
    const adapter = createAdapter({
      esbuildOptions: expected,
    });
    const builder = getMockBuilder();

    await adapter.adapt(builder);

    expect(build).toHaveBeenCalledWith(expect.objectContaining(expected));
  });

  it('calls esbuild with options #2', async () => {
    const expected = {
      minify: true,
    };
    const adapter = createAdapter({
      esbuildOptions: expected,
    });
    const builder = getMockBuilder();

    await adapter.adapt(builder);

    expect(build).toHaveBeenCalledWith(expect.objectContaining(expected));
  });
});
