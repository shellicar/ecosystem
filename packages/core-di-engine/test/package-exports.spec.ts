import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Imports the package by its own published name from a real `node` subprocess,
// rather than through vitest. Vitest's own module loader (Vite's SSR resolver)
// does not perform Node's strict ESM export linking: a named re-export that
// does not actually exist upstream resolves as `undefined` there instead of
// throwing, so a plain `await import('@shellicar/core-di-engine')` inside a
// vitest test cannot see this bug at all. A real `node` process, importing by
// the package's own name (going through its actual `package.json` "exports"
// map, the same path a real consumer takes), is the only thing that reproduces
// it. `IForwardResult` is checked explicitly because it is a real class
// (a runtime value) that a rolled-up `.d.ts` can still describe correctly even
// after a `type`-only export drops the binding from the actual built JS.
describe('The published package actually works when imported by name, under real Node', () => {
  it('loads through the ESM build (the "import" condition)', () => {
    const script =
      "const m = await import('@shellicar/core-di-engine'); if (typeof m.dependsOn !== 'function') throw new Error('dependsOn missing'); if (typeof m.IForwardResult !== 'function') throw new Error('IForwardResult missing');";
    expect(() => execFileSync(process.execPath, ['--input-type=module'], { cwd: import.meta.dirname, input: script, stdio: 'pipe' })).not.toThrow();
  });

  it('loads through the CJS build (the "require" condition)', () => {
    const script =
      "const m = require('@shellicar/core-di-engine'); if (typeof m.dependsOn !== 'function') throw new Error('dependsOn missing'); if (typeof m.IForwardResult !== 'function') throw new Error('IForwardResult missing');";
    expect(() => execFileSync(process.execPath, ['-e', script], { cwd: import.meta.dirname, stdio: 'pipe' })).not.toThrow();
  });
});
