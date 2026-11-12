import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type VerifyResult, verifyChangelog } from './verify-changelog.js';

// Verify the CHANGELOG.md of the package at packageDir, a path relative to repoRoot,
// against the version being published.
// TODO(claude): undecided: whether finding and reading the changelog is its own function apart from verifying it. One function for now.
export function verifyPackageChangelog(repoRoot: string, packageDir: string, version: string): VerifyResult {
  const changelogPath = resolve(repoRoot, packageDir, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    return { ok: false, message: `No CHANGELOG.md found in ${packageDir}` };
  }
  return verifyChangelog(readFileSync(changelogPath, 'utf8'), version);
}
