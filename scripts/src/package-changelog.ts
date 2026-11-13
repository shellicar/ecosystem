import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type VerifyResult, verifyChangelog } from './verify-changelog.js';

export type ReadResult = { ok: true; changelog: string } | { ok: false; message: string };

// Read the CHANGELOG.md of the package at packageDir, a path relative to repoRoot.
export function readPackageChangelog(repoRoot: string, packageDir: string): ReadResult {
  const changelogPath = resolve(repoRoot, packageDir, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    return { ok: false, message: `No CHANGELOG.md found in ${packageDir}` };
  }
  return { ok: true, changelog: readFileSync(changelogPath, 'utf8') };
}

// Verify the CHANGELOG.md of the package at packageDir, a path relative to repoRoot,
// against the version being published.
export function verifyPackageChangelog(repoRoot: string, packageDir: string, version: string): VerifyResult {
  const read = readPackageChangelog(repoRoot, packageDir);
  if (!read.ok) {
    return read;
  }
  return verifyChangelog(read.changelog, version);
}
