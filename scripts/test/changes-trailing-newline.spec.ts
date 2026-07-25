import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packagesDir = join(import.meta.dirname, '..', '..', 'packages');

const changesFiles = readdirSync(packagesDir)
  .map((name) => join(packagesDir, name, 'changes.jsonl'))
  .filter((path) => existsSync(path));

describe('every changes.jsonl ends with a newline, so the next appended entry starts on its own line', () => {
  it.each(changesFiles)('%s ends with a newline', (path) => {
    const actual = readFileSync(path, 'utf8').endsWith('\n');

    expect(actual).toBe(true);
  });
});
