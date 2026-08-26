import { describe, expect, it } from 'vitest';
import plugin from '../src';

// Behaviour-defining: the cleanup only ever runs from the esbuild hook. The
// other bundler entry points are published and importable but register nothing,
// so nothing cleans. These pin that as it stands today.
const cleanupCapableHooks = ['buildEnd', 'writeBundle', 'generateBundle', 'closeBundle'];

// unplugin's factories return either one plugin or several, depending on the
// bundler, so both shapes are flattened before the hooks are looked for.
const cleanupHooksOn = <T extends object>(created: T | T[]): string[] => {
  const plugins = Array.isArray(created) ? created : [created];
  return cleanupCapableHooks.filter((hook) => plugins.some((instance) => hook in instance));
};

describe('plugin surface', () => {
  it('registers the cleanup on the esbuild plugin', () => {
    const expected = 'function';
    const actual = typeof plugin.esbuild({}).setup;

    expect(actual).toBe(expected);
  });

  it('registers no hook that could clean on the vite plugin', () => {
    const expected: string[] = [];
    const actual = cleanupHooksOn(plugin.vite({}));

    expect(actual).toEqual(expected);
  });

  it('registers no hook that could clean on the rollup plugin', () => {
    const expected: string[] = [];
    const actual = cleanupHooksOn(plugin.rollup({}));

    expect(actual).toEqual(expected);
  });
});
