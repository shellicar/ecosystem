import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderChangelog } from './render-changelog.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');

const config = JSON.parse(readFileSync(resolve(repoRoot, 'changes.config.json'), 'utf8'));
const categories: Record<string, string> = config.categories;

const packageDir = process.argv[2];
if (!packageDir) {
  console.error('usage: generate-changelog.ts <package-dir>');
  process.exit(1);
}

const absDir = resolve(packageDir);
const pkg = JSON.parse(readFileSync(resolve(absDir, 'package.json'), 'utf8'));
const shortName: string = pkg.name.split('/').pop();

const lines = readFileSync(resolve(absDir, 'changes.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

const output = renderChangelog(lines, shortName, categories);
const changelogPath = resolve(absDir, 'CHANGELOG.md');
writeFileSync(changelogPath, output);
console.log(`wrote ${changelogPath}`);
