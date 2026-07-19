import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The `Symbol.metadata` polyfill is imported for its side effect only
 * (`import './polyfill'` in the barrel). A bundler is free to drop a
 * side-effect-only import unless the package's `sideEffects` field marks the
 * module as impure, and it evaluates that field against the *source* file
 * (`src/polyfill.ts`), not the built output. So a `sideEffects` list of `dist`
 * paths alone leaves the source polyfill unprotected: a bundler tree-shakes it
 * away and `@dependsOn` silently stops recording edges.
 *
 * These tests drive esbuild over the *real* polyfill source with different
 * `sideEffects` values and assert on whether the polyfill's assignment survives
 * the bundle. The `false` and dist-only cases prove the drop is real; the
 * shipped case (read from the real `package.json`) proves the fix retains it.
 */

// The polyfill's assignment lives in the engine package (core-di's own
// src/polyfill.ts is a re-export shim), so the source under test and the
// sideEffects field protecting it are the engine's.
const polyfillSource = new URL('../src/polyfill.ts', import.meta.url);
const packageJson = new URL('../package.json', import.meta.url);

/** The polyfill's one statement, as it reads once bundled: present iff the module survived. */
const polyfillAssignment = /Symbol\.for\(['"]Symbol\.metadata['"]\)/;

let polyfillText: string;
let shippedSideEffects: readonly string[];
let workDir: string;

beforeAll(async () => {
  polyfillText = await readFile(polyfillSource, 'utf8');
  const pkg = JSON.parse(await readFile(packageJson, 'utf8')) as { sideEffects: readonly string[] };
  shippedSideEffects = pkg.sideEffects;
  workDir = await mkdtemp(join(tmpdir(), 'core-di-polyfill-'));
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

/**
 * Bundles a barrel that imports the real polyfill for its side effect under the
 * given `sideEffects`, and reports whether the polyfill's assignment survived
 * the bundle's tree-shaking.
 */
const polyfillSurvivesBundle = async (sideEffects: boolean | readonly string[]): Promise<boolean> => {
  const dir = await mkdtemp(join(workDir, 'case-'));
  await writeFile(join(dir, 'polyfill.ts'), polyfillText);
  await writeFile(join(dir, 'barrel.ts'), "import './polyfill';\nexport const marker = 1;\n");
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'polyfill-treeshake-case', version: '0.0.0', sideEffects }));

  const result = await build({
    entryPoints: [join(dir, 'barrel.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    treeShaking: true,
    logLevel: 'silent',
  });

  return polyfillAssignment.test(result.outputFiles[0].text);
};

describe('Symbol.metadata polyfill tree-shaking', () => {
  it('drops the polyfill when sideEffects marks the package pure', async () => {
    const expected = false;

    const actual = await polyfillSurvivesBundle(false);

    expect(actual).toBe(expected);
  });

  it('drops the polyfill when sideEffects lists only dist paths', async () => {
    const expected = false;

    const actual = await polyfillSurvivesBundle(['./dist/esm/polyfill.js', './dist/cjs/polyfill.cjs']);

    expect(actual).toBe(expected);
  });

  it('retains the polyfill under the shipped sideEffects', async () => {
    const expected = true;

    const actual = await polyfillSurvivesBundle(shippedSideEffects);

    expect(actual).toBe(expected);
  });
});
