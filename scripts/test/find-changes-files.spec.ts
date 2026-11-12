import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findChangesFiles, isExcludedPath } from '../src/find-changes-files.js';

describe('isExcludedPath', () => {
  it.each(['node_modules/pkg/changes.jsonl', 'packages/a/node_modules/pkg/changes.jsonl', '.git/changes.jsonl', 'packages/a/.git/changes.jsonl', 'dist/changes.jsonl', 'packages/a/dist/changes.jsonl'])('excludes %s', (path) => {
    const actual = isExcludedPath(path);

    expect(actual).toBe(true);
  });

  it.each(['packages/build-dist-tag/changes.jsonl', 'packages/my-node_modules-tool/changes.jsonl', '.github/changes.jsonl', 'packages/a.git/changes.jsonl', 'packages/distribution/changes.jsonl'])('keeps %s', (path) => {
    const actual = isExcludedPath(path);

    expect(actual).toBe(false);
  });
});

describe('findChangesFiles', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'find-changes-files-'));
    for (const path of ['packages/build-dist-tag/changes.jsonl', 'packages/a/changes.jsonl', 'node_modules/pkg/changes.jsonl', '.git/changes.jsonl', 'packages/a/dist/changes.jsonl']) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), '');
    }
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds the changes.jsonl of packages, including one under a folder whose name contains dist, and none under node_modules, .git or dist', async () => {
    const expected = [join(root, 'packages/a/changes.jsonl'), join(root, 'packages/build-dist-tag/changes.jsonl')];

    const actual = (await findChangesFiles(root)).sort();

    expect(actual).toEqual(expected);
  });
});
