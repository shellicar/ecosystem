import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const listTsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listTsFiles(full) : full.endsWith('.ts') && !full.endsWith('.d.ts') ? [full] : [];
  });

const parse = (file: string) => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

const hasExportModifier = (node: ts.Node): boolean => (ts.canHaveModifiers(node) ? (ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false) : false);

// A class/function/enum/const declaration is unambiguously a runtime value —
// unlike an interface or type alias, which never exist at runtime at all.
const declaredValueNames = (sourceFile: ts.SourceFile): Set<string> => {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name) {
      names.add(statement.name.text);
    } else if (ts.isEnumDeclaration(statement)) {
      names.add(statement.name.text);
    } else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
      }
    }
  }
  return names;
};

// Resolves a module specifier the same way node would from `fromFile`: a
// relative path (with or without extension, or a directory's index.ts), or —
// for a bare specifier — the workspace symlink pnpm places in node_modules,
// so a sibling package's own src is reachable without hardcoding its path.
const resolveSpecifier = (specifier: string, fromFile: string): string | undefined => {
  if (specifier.startsWith('.')) {
    const base = resolve(dirname(fromFile), specifier);
    for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
      if (existsSync(candidate)) return candidate;
    }
    return undefined;
  }
  let dir = dirname(fromFile);
  for (let i = 0; i < 20; i++) {
    const candidate = join(dir, 'node_modules', specifier);
    if (existsSync(candidate)) return join(candidate, 'src', 'index.ts');
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
};

const collectMustBeDefined = (barrelPath: string, seen = new Set<string>()): Set<string> => {
  const mustBeDefinedAtRuntime = new Set<string>();
  if (seen.has(barrelPath)) return mustBeDefinedAtRuntime;
  seen.add(barrelPath);

  const sourceFile = parse(barrelPath);
  const ownValueNames = declaredValueNames(sourceFile);

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const resolved = resolveSpecifier(statement.moduleSpecifier.text, barrelPath);
    if (!resolved) throw new Error(`Could not resolve '${statement.moduleSpecifier.text}' from ${barrelPath}`);

    if (!statement.exportClause) {
      // `export * from '...'`: every value the target module declares, or (if
      // the target is itself a barrel re-exporting further) re-exports.
      for (const name of declaredValueNames(parse(resolved))) mustBeDefinedAtRuntime.add(name);
      for (const name of collectMustBeDefined(resolved, seen)) mustBeDefinedAtRuntime.add(name);
      continue;
    }
    if (!ts.isNamedExports(statement.exportClause)) continue;

    const targetValueNames = declaredValueNames(parse(resolved));
    for (const element of statement.exportClause.elements) {
      const original = (element.propertyName ?? element.name).text;
      if (targetValueNames.has(original)) mustBeDefinedAtRuntime.add(element.name.text);
    }
  }
  return mustBeDefinedAtRuntime;
};

/**
 * A name that type-checks as a value can still be dropped from the built JS if the public barrel marks it `type`-only; checking reality (where a name is actually declared) against the barrel's claim is the only way to catch it.
 * @param packageName The published name to import in a real node subprocess, going through its actual package.json "exports" map.
 * @param barrelPath Absolute path to the package's public barrel (its src/index.ts).
 * @param cwd Absolute path the subprocess runs from, so `packageName` resolves via that directory's node_modules (typically the test file's own directory).
 */
export const describePackageExports = (packageName: string, barrelPath: string, cwd: string) => {
  const mustBeDefinedAtRuntime = collectMustBeDefined(barrelPath);
  const assertDefined = `for (const name of ${JSON.stringify([...mustBeDefinedAtRuntime])}) if (m[name] === undefined) throw new Error(name + ' is undefined');`;

  const runInSubprocess = (args: string[], input?: string) => {
    try {
      execFileSync(process.execPath, args, { cwd, input, stdio: 'pipe' });
    } catch (error) {
      throw new Error((error as { stderr?: Buffer }).stderr?.toString() || String(error));
    }
  };

  describe('Every name declared as a class/const/function/enum in src, and re-exported by the barrel, is a real runtime value', () => {
    it('found at least one such name to check (otherwise this test verifies nothing)', () => {
      expect(mustBeDefinedAtRuntime.size).toBeGreaterThan(0);
    });

    it('is present in the ESM build (the "import" condition)', () => {
      runInSubprocess(['--input-type=module'], `const m = await import('${packageName}'); ${assertDefined}`);
    });

    it('is present in the CJS build (the "require" condition)', () => {
      runInSubprocess(['-e', `const m = require('${packageName}'); ${assertDefined}`]);
    });
  });
};
