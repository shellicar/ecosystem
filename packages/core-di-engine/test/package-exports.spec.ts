import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Runs in a real node subprocess, not vitest: vitest's own module loader doesn't
// enforce Node's strict ESM export linking, so a missing re-export wouldn't fail here.
const assertAllExportsDefined = "for (const [k, v] of Object.entries(m)) if (v === undefined) throw new Error(k + ' is undefined');";

describe('The published package actually works when imported by name, under real Node', () => {
  it('loads through the ESM build (the "import" condition)', () => {
    const script = `const m = await import('@shellicar/core-di-engine'); ${assertAllExportsDefined}`;
    expect(() => execFileSync(process.execPath, ['--input-type=module'], { cwd: import.meta.dirname, input: script, stdio: 'pipe' })).not.toThrow();
  });

  it('loads through the CJS build (the "require" condition)', () => {
    const script = `const m = require('@shellicar/core-di-engine'); ${assertAllExportsDefined}`;
    expect(() => execFileSync(process.execPath, ['-e', script], { cwd: import.meta.dirname, stdio: 'pipe' })).not.toThrow();
  });
});
