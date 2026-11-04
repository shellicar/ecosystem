import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const scriptsDir = join(import.meta.dirname, '..');
const repoRoot = join(scriptsDir, '..');
const cli = join(scriptsDir, 'src', 'verify-changelog-cli.ts');

const changelog = `# Changelog

## [Unreleased]

## [1.1.0] - 2026-11-04

### Fixed

- Fix the thing

## [1.0.0] - 2026-11-01

### Added

- Initial release
`;

// Runs the script with node and the tsx loader from scripts/, as the publish step does.
function run(...args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], { cwd: scriptsDir, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('verify-changelog-cli', () => {
  let root: string;
  let withChangelog: string;
  let withoutChangelog: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'verify-changelog-cli-'));
    withChangelog = join(root, 'with-changelog');
    withoutChangelog = join(root, 'without-changelog');
    mkdirSync(withChangelog);
    mkdirSync(withoutChangelog);
    writeFileSync(join(withChangelog, 'CHANGELOG.md'), changelog);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('exits 0 when the changelog passes', () => {
    const expected = { status: 0, stdout: '✅ Changelog OK\n', stderr: '' };

    const actual = run(withChangelog, '1.1.0');

    expect(actual).toEqual(expected);
  });

  it('finds the package directory relative to the repo root', () => {
    const expected = { status: 0, stdout: '✅ Changelog OK\n', stderr: '' };

    const actual = run(relative(repoRoot, withChangelog), '1.1.0');

    expect(actual).toEqual(expected);
  });

  it('exits 1 when the changelog fails the check', () => {
    const expected = { status: 1, stdout: '', stderr: '❌ First version heading [1.1.0] does not match release version [1.2.0]\n' };

    const actual = run(withChangelog, '1.2.0');

    expect(actual).toEqual(expected);
  });

  it('exits 1 when there is no CHANGELOG.md', () => {
    const expected = { status: 1, stdout: '', stderr: `❌ No CHANGELOG.md found in ${withoutChangelog}\n` };

    const actual = run(withoutChangelog, '1.1.0');

    expect(actual).toEqual(expected);
  });

  it('exits 64 when the version is missing', () => {
    const expected = { status: 64, stdout: '', stderr: 'usage: verify-changelog-cli.ts <package-dir> <version>\n' };

    const actual = run(withChangelog);

    expect(actual).toEqual(expected);
  });
});
