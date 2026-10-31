import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const scriptsDir = join(import.meta.dirname, '..');
const repoRoot = join(scriptsDir, '..');

// The validator finds the workspace from its own location, so it runs from a copy placed in a
// workspace that has its schema and no changes.jsonl.
describe('validate-changes in a workspace with no changes.jsonl', () => {
  let workspace: string;
  let validator: string;

  beforeAll(() => {
    workspace = mkdtempSync(join(tmpdir(), 'validate-changes-'));
    mkdirSync(join(workspace, 'scripts', 'src'), { recursive: true });
    mkdirSync(join(workspace, 'schema'));
    validator = join(workspace, 'scripts', 'src', 'validate-changes.ts');
    copyFileSync(join(scriptsDir, 'src', 'validate-changes.ts'), validator);
    copyFileSync(join(repoRoot, 'schema', 'shellicar-changes.schema.json'), join(workspace, 'schema', 'shellicar-changes.schema.json'));
    symlinkSync(join(scriptsDir, 'node_modules'), join(workspace, 'scripts', 'node_modules'), 'dir');
  });

  afterAll(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('exits 2', () => {
    const expected = 2;

    const actual = spawnSync(process.execPath, ['--import', 'tsx', validator], { cwd: scriptsDir }).status;

    expect(actual).toBe(expected);
  });
});
