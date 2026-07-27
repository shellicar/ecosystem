import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Runs in a real node subprocess, not vitest: vitest's own module loader doesn't
// enforce Node's strict ESM export linking, so a missing re-export wouldn't fail here.
// IForwardResult is checked explicitly: it's a real class, so a rolled-up .d.ts can
// still describe it correctly even after a type-only export drops it from the built JS.
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
