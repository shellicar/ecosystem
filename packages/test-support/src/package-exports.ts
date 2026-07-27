import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const parse = (file: string) => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

const hasExportModifier = (node: ts.Node): boolean => (ts.canHaveModifiers(node) ? (ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false) : false);

type Kind = 'value' | 'type';

// A class/function/enum/const declaration is unambiguously a runtime value;
// an interface or type alias never exists at runtime at all.
const localDeclarationKind = (sourceFile: ts.SourceFile, name: string): Kind | undefined => {
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name?.text === name) return 'value';
    if (ts.isEnumDeclaration(statement) && statement.name.text === name) return 'value';
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name) return 'value';
      }
    }
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === name) return 'type';
    if (ts.isTypeAliasDeclaration(statement) && statement.name.text === name) return 'type';
  }
  return undefined;
};

const declaredValueNames = (sourceFile: ts.SourceFile): Set<string> => {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;
    if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name) names.add(statement.name.text);
    else if (ts.isEnumDeclaration(statement)) names.add(statement.name.text);
    else if (ts.isVariableStatement(statement)) {
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
// so a sibling package's own src is reachable without hardcoding its path. A
// bare specifier pointing at a real (non-workspace) npm package has no src to
// check, so it falls through to "unresolvable" rather than returning a path
// that doesn't exist.
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
    const candidate = join(dir, 'node_modules', specifier, 'src', 'index.ts');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
};

// Follows a re-exported name through as many hops as it takes to reach either
// a real declaration (value or type) or run out of barrel — a name that
// vanishes partway through a chain is exactly the bug this guards against, so
// an unresolvable hop is a broken assumption, not something to shrug past.
const resolveNameKind = (name: string, file: string, seen: Set<string>): Kind => {
  const key = `${file}\u0000${name}`;
  if (seen.has(key)) throw new Error(`Circular re-export resolving '${name}' via ${file}`);
  seen.add(key);

  const sourceFile = parse(file);
  const local = localDeclarationKind(sourceFile, name);
  if (local) return local;

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const resolved = resolveSpecifier(statement.moduleSpecifier.text, file);
    if (!resolved) throw new Error(`Could not resolve '${statement.moduleSpecifier.text}' from ${file}`);

    if (!statement.exportClause) {
      // `export * from '...'`: try the wildcard target; it may not be where
      // `name` actually comes from, so a miss here isn't itself an error.
      try {
        return resolveNameKind(name, resolved, new Set(seen));
      } catch {
        continue;
      }
    }
    if (ts.isNamespaceExport(statement.exportClause)) continue; // carries no individual names to match against
    for (const element of statement.exportClause.elements) {
      if (element.name.text !== name) continue;
      const original = (element.propertyName ?? element.name).text;
      return resolveNameKind(original, resolved, seen);
    }
  }
  throw new Error(`Could not find a declaration for '${name}' starting from ${file}`);
};

const collectMustBeDefined = (barrelPath: string, seen = new Set<string>()): Set<string> => {
  const mustBeDefinedAtRuntime = new Set<string>();
  if (seen.has(barrelPath)) return mustBeDefinedAtRuntime;
  seen.add(barrelPath);

  const sourceFile = parse(barrelPath);

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
    if (ts.isNamespaceExport(statement.exportClause)) {
      // `export * as ns from '...'`: the namespace object itself is always a real value.
      mustBeDefinedAtRuntime.add(statement.exportClause.name.text);
      continue;
    }
    for (const element of statement.exportClause.elements) {
      const original = (element.propertyName ?? element.name).text;
      if (resolveNameKind(original, resolved, new Set()) === 'value') mustBeDefinedAtRuntime.add(element.name.text);
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
