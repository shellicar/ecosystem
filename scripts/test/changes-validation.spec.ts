import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateChanges, validateChangesContent } from '../src/changes-validation.js';

const repoRoot = join(import.meta.dirname, '..', '..');

const release = (version: string) => JSON.stringify({ type: 'release', version, date: '2026-11-13' });
const entry = JSON.stringify({ description: 'Fixed something', category: 'fixed' });

describe('validateChanges', () => {
  let emptyRoot: string;

  beforeAll(() => {
    emptyRoot = mkdtempSync(join(tmpdir(), 'validate-changes-'));
  });

  afterAll(() => {
    rmSync(emptyRoot, { recursive: true, force: true });
  });

  it('reports finding no files when none are given and the root has no changes.jsonl', async () => {
    const expected = { kind: 'no-files' };

    const actual = await validateChanges(emptyRoot, []);

    expect(actual).toEqual(expected);
  });

  it("passes the repo's own changes.jsonl files", async () => {
    const expected = { kind: 'checked', failures: [] };

    const actual = await validateChanges(repoRoot, []);

    expect(actual).toEqual(expected);
  });
});

describe('validateChangesContent', () => {
  it('passes release markers with ascending semver versions', () => {
    const expected: unknown[] = [];

    const actual = validateChangesContent('changes.jsonl', [entry, release('1.0.0'), entry, release('1.1.0'), ''].join('\n'));

    expect(actual).toEqual(expected);
  });

  it('fails a line the schema rejects', () => {
    const expected = [expect.objectContaining({ file: 'changes.jsonl', line: 2 })];

    const actual = validateChangesContent('changes.jsonl', [entry, '{"description":"Fixed something","category":"nope"}', ''].join('\n'));

    expect(actual).toEqual(expected);
  });

  it('fails a release marker whose version is not valid semver', () => {
    const expected = [{ file: 'changes.jsonl', line: 2, message: 'release version 1.0 is not a valid semver version' }];

    const actual = validateChangesContent('changes.jsonl', [entry, release('1.0'), ''].join('\n'));

    expect(actual).toEqual(expected);
  });

  it('fails a release marker whose version is not above the marker before it', () => {
    const expected = [{ file: 'changes.jsonl', line: 4, message: 'release version 1.0.0 is not above the release before it (1.1.0)' }];

    const actual = validateChangesContent('changes.jsonl', [entry, release('1.1.0'), entry, release('1.0.0'), ''].join('\n'));

    expect(actual).toEqual(expected);
  });
});
