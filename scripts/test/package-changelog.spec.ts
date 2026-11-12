import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { verifyPackageChangelog } from '../src/package-changelog.js';

const changelog = '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-11-13\n\n### Fixed\n\n- Fixed something\n';

describe('verifyPackageChangelog', () => {
  let repoRoot: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'package-changelog-'));
    mkdirSync(join(repoRoot, 'packages', 'with-changelog'), { recursive: true });
    writeFileSync(join(repoRoot, 'packages', 'with-changelog', 'CHANGELOG.md'), changelog);
    mkdirSync(join(repoRoot, 'packages', 'without-changelog'), { recursive: true });
  });

  afterAll(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('finds the package from a path relative to the repo root', () => {
    const expected = { ok: true };

    const actual = verifyPackageChangelog(repoRoot, 'packages/with-changelog', '1.2.3');

    expect(actual).toEqual(expected);
  });

  it('finds the package from a path relative to the repo root that starts with ./', () => {
    const expected = { ok: true };

    const actual = verifyPackageChangelog(repoRoot, './packages/with-changelog', '1.2.3');

    expect(actual).toEqual(expected);
  });

  it('fails when the package has no CHANGELOG.md', () => {
    const expected = { ok: false, message: 'No CHANGELOG.md found in packages/without-changelog' };

    const actual = verifyPackageChangelog(repoRoot, 'packages/without-changelog', '1.2.3');

    expect(actual).toEqual(expected);
  });
});
