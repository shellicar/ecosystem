import { posix, resolve, win32 } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toImportSpecifier } from '../src/toImportSpecifier';

describe('toImportSpecifier', () => {
  it('builds a relative specifier from posix paths', () => {
    const from = '/project/.svelte-kit/adapter-azure-functions';
    const to = '/project/.svelte-kit/output/server';

    const expected = '../output/server';
    const actual = toImportSpecifier(from, to, posix);

    expect(actual).toBe(expected);
  });

  // Fails wherever the platform's own separator is not the posix one: the
  // result keeps the separator it was given, and an import specifier cannot.
  it('builds a forward-slashed specifier from Windows paths', () => {
    const from = 'D:\\project\\.svelte-kit\\adapter-azure-functions';
    const to = 'D:\\project\\.svelte-kit\\output\\server';

    const expected = '../output/server';
    const actual = toImportSpecifier(from, to, win32);

    expect(actual).toBe(expected);
  });

  // The other half, and the one only a Windows runner can catch: the paths the
  // adapter really passes are in the running platform's form, so posix
  // semantics are the wrong ones to read them with anywhere but unix.
  it('builds a forward-slashed specifier from paths in the running platform form', () => {
    const from = resolve('project', '.svelte-kit', 'adapter-azure-functions');
    const to = resolve('project', '.svelte-kit', 'output', 'server');

    const expected = '../output/server';
    const actual = toImportSpecifier(from, to);

    expect(actual).toBe(expected);
  });
});
