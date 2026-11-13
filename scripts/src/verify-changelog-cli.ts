import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPackageChangelog } from './package-changelog.js';

// Verify a package's CHANGELOG.md against the version being published.
// Exits 0 when it passes, 1 when it fails, and 64 when the arguments are wrong.

// scripts/src -> scripts -> repo root
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const [packageDir, version] = process.argv.slice(2);
if (!packageDir || !version) {
  console.error('usage: verify-changelog-cli.ts <package-dir> <version>');
  process.exit(64);
}

const result = verifyPackageChangelog(repoRoot, packageDir, version);
if (!result.ok) {
  console.error(`❌ ${result.message}`);
  process.exit(1);
}
console.log('✅ Changelog OK');
