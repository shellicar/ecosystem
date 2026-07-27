import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const listTsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listTsFiles(full) : full.endsWith('.ts') ? [full] : [];
  });

const declaredValueNamesByFile = (sourceRoots: readonly string[]): Map<string, Set<string>> => {
  const byFile = new Map<string, Set<string>>();
  for (const root of sourceRoots) {
    for (const file of listTsFiles(root)) {
      const names = new Set<string>();
      for (const m of readFileSync(file, 'utf8').matchAll(/export\s+(?:abstract\s+)?(?:class|const|function|enum)\s+([A-Za-z_$][\w$]*)/g)) {
        names.add(m[1]);
      }
      byFile.set(file, names);
    }
  }
  return byFile;
};

/**
 * A name that type-checks as a value can still be dropped from the built JS if
 * the public barrel marks it `type`-only — and a bundler rolling up a
 * package's own internal modules won't leave a dangling reference behind, so
 * nothing throws when a package imports itself; the drop is silent. The only
 * way to catch it is to check reality (where a name is actually declared)
 * against the barrel's claim, not trust the barrel's own `type` annotation,
 * which is exactly what's wrong when this bug happens.
 *
 * @param packageName The published name to import in a real node subprocess (going through its actual package.json "exports" map).
 * @param barrelPath Absolute path to the package's public barrel (its src/index.ts).
 * @param sourceRoots Absolute paths to every src directory whose declarations count as "reality" — the package's own, plus any sibling package it re-exports named values from.
 * @param cwd Absolute path the subprocess runs from, so `packageName` resolves via that directory's node_modules (typically the test file's own directory).
 */
export const describePackageExports = (packageName: string, barrelPath: string, sourceRoots: readonly string[], cwd: string) => {
  const byFile = declaredValueNamesByFile(sourceRoots);
  const declaredValueNames = new Set([...byFile.values()].flatMap((names) => [...names]));
  const barrel = readFileSync(barrelPath, 'utf8');
  const barrelDir = dirname(barrelPath);
  const mustBeDefinedAtRuntime = new Set<string>();

  for (const m of barrel.matchAll(/export\s+(?:type\s+)?\*\s+from\s+'([^']+)'/g)) {
    if (!m[1].startsWith('.')) continue;
    for (const name of byFile.get(resolve(barrelDir, `${m[1]}.ts`)) ?? []) {
      mustBeDefinedAtRuntime.add(name);
    }
  }
  for (const m of barrel.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)) {
    for (const rawSpecifier of m[1].split(',')) {
      const specifier = rawSpecifier.trim().replace(/^type\s+/, '');
      if (!specifier) continue;
      const [original, , alias] = specifier.split(/\s+/);
      if (declaredValueNames.has(original)) {
        mustBeDefinedAtRuntime.add(alias ?? original);
      }
    }
  }

  const assertDefined = `for (const name of ${JSON.stringify([...mustBeDefinedAtRuntime])}) if (m[name] === undefined) throw new Error(name + ' is undefined');`;

  describe('Every name declared as a class/const/function/enum in src, and re-exported by the barrel, is a real runtime value', () => {
    it('is present in the ESM build (the "import" condition)', () => {
      const script = `const m = await import('${packageName}'); ${assertDefined}`;
      expect(() => execFileSync(process.execPath, ['--input-type=module'], { cwd, input: script, stdio: 'pipe' })).not.toThrow();
    });

    it('is present in the CJS build (the "require" condition)', () => {
      const script = `const m = require('${packageName}'); ${assertDefined}`;
      expect(() => execFileSync(process.execPath, ['-e', script], { cwd, stdio: 'pipe' })).not.toThrow();
    });
  });
};
