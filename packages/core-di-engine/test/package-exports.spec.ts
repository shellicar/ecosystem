import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// A name that type-checks as a value can still be dropped from the built JS if
// the public barrel marks it `type`-only — and a bundler rolling up this
// package's own internal modules won't leave a dangling reference behind, so
// nothing throws when this package imports itself; the drop is silent. The
// only way to catch it here is to check reality (where a name is actually
// declared) against the barrel's claim, not trust the barrel's own `type`
// annotation, which is exactly what's wrong when this bug happens.

const srcDir = resolve(import.meta.dirname, '../src');

const listTsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listTsFiles(full) : full.endsWith('.ts') ? [full] : [];
  });

const declaredValueNames = new Set<string>();
const declaredValueNamesByFile = new Map<string, Set<string>>();
for (const file of listTsFiles(srcDir)) {
  const names = new Set<string>();
  for (const m of readFileSync(file, 'utf8').matchAll(/export\s+(?:abstract\s+)?(?:class|const|function|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
    declaredValueNames.add(m[1]);
  }
  declaredValueNamesByFile.set(file, names);
}

const resolveModule = (specifier: string) => resolve(srcDir, `${specifier}.ts`);

const barrel = readFileSync(join(srcDir, 'index.ts'), 'utf8');
const mustBeDefinedAtRuntime = new Set<string>();

for (const m of barrel.matchAll(/export\s+(?:type\s+)?\*\s+from\s+'([^']+)'/g)) {
  for (const name of declaredValueNamesByFile.get(resolveModule(m[1])) ?? []) {
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
    const script = `const m = await import('@shellicar/core-di-engine'); ${assertDefined}`;
    expect(() => execFileSync(process.execPath, ['--input-type=module'], { cwd: import.meta.dirname, input: script, stdio: 'pipe' })).not.toThrow();
  });

  it('is present in the CJS build (the "require" condition)', () => {
    const script = `const m = require('@shellicar/core-di-engine'); ${assertDefined}`;
    expect(() => execFileSync(process.execPath, ['-e', script], { cwd: import.meta.dirname, stdio: 'pipe' })).not.toThrow();
  });
});
