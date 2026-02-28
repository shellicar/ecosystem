#!/usr/bin/env node
// Fix exports condition ordering in package.json files.
// Ensures "import" comes before "require" in each exports entry,
// and "types" comes before "default" within each condition.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKSPACE_DIR = '/home/stephen/repos/@shellicar';

const LIBRARY_REPOS = [
  'build-azure-local-settings',
  'build-clean',
  'build-graphql',
  'build-version',
  'core-config',
  'core-di',
  'cosmos-query-builder',
  'svelte-adapter-azure-functions',
  'ui-shadcn',
  'winston-azure-application-insights',
];

function reorderKeys(obj, preferredOrder) {
  const result = {};
  for (const key of preferredOrder) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  for (const key of Object.keys(obj)) {
    if (!(key in result)) {
      result[key] = obj[key];
    }
  }
  return result;
}

function fixExportsEntry(entry) {
  let changed = false;

  // Fix condition ordering: import before require
  const keys = Object.keys(entry);
  const importIdx = keys.indexOf('import');
  const requireIdx = keys.indexOf('require');

  if (importIdx !== -1 && requireIdx !== -1 && importIdx > requireIdx) {
    entry = reorderKeys(entry, ['import', 'require']);
    changed = true;
  }

  // Fix inner ordering: types before default
  for (const condition of ['import', 'require']) {
    if (entry[condition] && typeof entry[condition] === 'object') {
      const innerKeys = Object.keys(entry[condition]);
      const typesIdx = innerKeys.indexOf('types');
      const defaultIdx = innerKeys.indexOf('default');

      if (typesIdx !== -1 && defaultIdx !== -1 && typesIdx > defaultIdx) {
        entry[condition] = reorderKeys(entry[condition], ['types', 'default']);
        changed = true;
      }
    }
  }

  return { entry, changed };
}

function fixExports(exports) {
  if (!exports || typeof exports !== 'object') {
    return { exports, changed: false };
  }

  let changed = false;

  // Check if exports is flat (no "." key, has import/require directly)
  if (('import' in exports || 'require' in exports) && !('.' in exports)) {
    const result = fixExportsEntry(exports);
    return { exports: result.entry, changed: result.changed };
  }

  // Nested under subpaths
  for (const [subpath, entry] of Object.entries(exports)) {
    if (typeof entry === 'object' && entry !== null) {
      const result = fixExportsEntry(entry);
      if (result.changed) {
        exports[subpath] = result.entry;
        changed = true;
      }
    }
  }

  return { exports, changed };
}

function findPackageJson(repo) {
  const packagesDir = resolve(WORKSPACE_DIR, repo, 'packages');
  if (existsSync(packagesDir)) {
    for (const dir of readdirSync(packagesDir)) {
      const candidate = resolve(packagesDir, dir, 'package.json');
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  const rootPkg = resolve(WORKSPACE_DIR, repo, 'package.json');
  if (existsSync(rootPkg)) {
    return rootPkg;
  }
  return null;
}

console.log('Fixing exports condition ordering...\n');

let fixed = 0;
for (const repo of LIBRARY_REPOS) {
  const pkgPath = findPackageJson(repo);
  if (!pkgPath) {
    console.log(`  ⏭️  ${repo}: package.json not found`);
    continue;
  }

  const content = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(content);

  if (!pkg.exports) {
    console.log(`  ⏭️  ${repo}: no exports field`);
    continue;
  }

  const { exports: fixedExports, changed } = fixExports(structuredClone(pkg.exports));

  if (!changed) {
    console.log(`  ✅ ${repo}: exports ordering correct`);
    continue;
  }

  pkg.exports = fixedExports;

  const indent = content.match(/^(\s+)/m)?.[1] || '  ';
  const newContent = JSON.stringify(pkg, null, indent) + '\n';
  writeFileSync(pkgPath, newContent);
  console.log(`  🔧 ${repo}: fixed exports ordering`);
  fixed++;
}

console.log(`\nDone. Fixed ${fixed} package(s).`);
