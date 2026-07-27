import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Runs in a real node subprocess, not vitest: vitest's own module loader doesn't
// enforce Node's strict ESM export linking, so a missing re-export wouldn't fail here.
describe('The published package actually works when imported by name, under real Node', () => {
  it('loads through the ESM build (the "import" condition)', () => {
    const script = "const m = await import('@shellicar/core-di'); if (typeof m.createServiceCollection !== 'function') throw new Error('createServiceCollection missing');";
    expect(() => execFileSync(process.execPath, ['--input-type=module'], { cwd: import.meta.dirname, input: script, stdio: 'pipe' })).not.toThrow();
  });

  it('loads through the CJS build (the "require" condition)', () => {
    const script = "const m = require('@shellicar/core-di'); if (typeof m.createServiceCollection !== 'function') throw new Error('createServiceCollection missing');";
    expect(() => execFileSync(process.execPath, ['-e', script], { cwd: import.meta.dirname, stdio: 'pipe' })).not.toThrow();
  });
});
