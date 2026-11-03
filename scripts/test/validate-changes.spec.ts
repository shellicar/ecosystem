import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const scriptsDir = join(import.meta.dirname, '..');
const repoRoot = join(scriptsDir, '..');

// The validator finds the workspace from its own location, so it runs from a copy placed in a
// workspace that has its schema and no changes.jsonl. The changes.jsonl files a test validates sit
// outside that workspace and are passed to the validator by path.
describe('validate-changes', () => {
  let root: string;
  let validator: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'validate-changes-'));
    const workspace = join(root, 'workspace');
    mkdirSync(join(workspace, 'scripts', 'src'), { recursive: true });
    mkdirSync(join(workspace, 'schema'));
    validator = join(workspace, 'scripts', 'src', 'validate-changes.ts');
    copyFileSync(join(scriptsDir, 'src', 'validate-changes.ts'), validator);
    copyFileSync(join(repoRoot, 'schema', 'shellicar-changes.schema.json'), join(workspace, 'schema', 'shellicar-changes.schema.json'));
    symlinkSync(join(scriptsDir, 'node_modules'), join(workspace, 'scripts', 'node_modules'), 'dir');
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function run(...args: string[]): number | null {
    return spawnSync(process.execPath, ['--import', 'tsx', validator, ...args], { cwd: scriptsDir }).status;
  }

  function changesFile(name: string, lines: object[]): string {
    const dir = join(root, 'changes', name);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'changes.jsonl');
    writeFileSync(path, lines.map((line) => `${JSON.stringify(line)}\n`).join(''));
    return path;
  }

  const entry = { description: 'Fix the thing', category: 'fixed' };
  const release = (version: string) => ({ type: 'release', version, date: '2026-11-03', tag: `example@${version}` });

  it('exits 2 when it finds no changes.jsonl files', () => {
    const expected = 2;

    const actual = run();

    expect(actual).toBe(expected);
  });

  it('passes release markers in ascending semver order', () => {
    const expected = 0;
    const path = changesFile('ascending', [entry, release('4.0.2'), entry, release('5.0.0-alpha.2'), entry, release('5.0.0-alpha.10'), entry, release('5.0.0')]);

    const actual = run(path);

    expect(actual).toBe(expected);
  });

  it('fails a release marker whose version is not valid semver', () => {
    const expected = 1;
    const path = changesFile('not-semver', [entry, release('1.0')]);

    const actual = run(path);

    expect(actual).toBe(expected);
  });

  it('fails a release marker whose version has a leading v', () => {
    const expected = 1;
    const path = changesFile('leading-v', [entry, release('v1.0.0')]);

    const actual = run(path);

    expect(actual).toBe(expected);
  });

  it('fails a release marker whose version is not above the marker before it', () => {
    const expected = 1;
    const path = changesFile('descending', [entry, release('1.1.0'), entry, release('1.0.0')]);

    const actual = run(path);

    expect(actual).toBe(expected);
  });

  it('fails a release marker whose version equals the marker before it', () => {
    const expected = 1;
    const path = changesFile('repeated', [entry, release('1.0.0'), entry, release('1.0.0')]);

    const actual = run(path);

    expect(actual).toBe(expected);
  });
});
