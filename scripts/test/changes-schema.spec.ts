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

describe('the committed changes schema, advisory ids', () => {
  const entry = (ghsa: unknown) => ({ description: 'Uses glob 14', category: 'security', metadata: { ghsa } });

  it('accepts one advisory id', () => {
    const expected = true;

    const actual = validate(entry('GHSA-3g3m-2fjr-6pw4'));

    expect(actual).toBe(expected);
  });

  it('accepts a list of advisory ids', () => {
    const expected = true;

    const actual = validate(entry(['GHSA-3g3m-2fjr-6pw4', 'GHSA-g3hv-75wg-m249']));

    expect(actual).toBe(expected);
  });

  it('rejects an empty list', () => {
    const expected = false;

    const actual = validate(entry([]));

    expect(actual).toBe(expected);
  });

  it('rejects a list with an item that is not an advisory id', () => {
    const expected = false;

    const actual = validate(entry(['GHSA-3g3m-2fjr-6pw4', 5]));

    expect(actual).toBe(expected);
  });

  it('rejects a value that is not an advisory id', () => {
    const expected = false;

    const actual = validate(entry('CVE-2026-25547'));

    expect(actual).toBe(expected);
  });
});
