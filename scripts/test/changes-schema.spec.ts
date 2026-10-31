import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

const schemaPath = join(import.meta.dirname, '..', '..', 'schema', 'shellicar-changes.schema.json');
const validate = new Ajv({ allErrors: true }).compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

describe('the committed changes schema', () => {
  it('rejects a release whose repo is not owner/name', () => {
    const expected = false;

    const actual = validate({ type: 'release', version: '3.1.6', date: '2026-02-28', tag: '3.1.6', repo: 'core-di' });

    expect(actual).toBe(expected);
  });
});
