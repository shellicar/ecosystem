import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import semver from 'semver';
import { findChangesFiles } from './find-changes-files.js';

// Validate changes.jsonl files against the @shellicar/changes JSON schema.
// The schema is generated from this repo's changes.config.json, so the
// allowed categories are baked into the schema and enforced by ajv.
// Each release marker's version must also be valid semver and above the
// version of the release marker before it in the same file.

export type Failure = { file: string; line: number; message: string };

export type ValidationResult = { kind: 'no-files' } | { kind: 'checked'; failures: Failure[] };

// scripts/src -> scripts -> repo root
// TODO(claude): undecided: whether the schema is a parameter or always this repo's. Always this repo's for now, read when the module loads.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const schemaPath = resolve(repoRoot, 'schema/shellicar-changes.schema.json');

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf-8')));

// A version written exactly as Semantic Versioning writes one. semver.parse also accepts a
// leading `v` and surrounding spaces, which the comparison with the original rejects.
function isSemver(version: string): boolean {
  const parsed = semver.parse(version);
  if (parsed == null) {
    return false;
  }
  const written = parsed.build.length > 0 ? `${parsed.version}+${parsed.build.join('.')}` : parsed.version;
  return written === version;
}

// Check the lines of one changes.jsonl, given its content. `file` is only used to label failures.
export function validateChangesContent(file: string, content: string): Failure[] {
  const failures: Failure[] = [];
  let previousVersion: string | undefined;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined || raw.trim() === '') {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      failures.push({ file, line: i + 1, message: `invalid JSON: ${(err as Error).message}` });
      continue;
    }

    if (!validate(parsed)) {
      failures.push({
        file,
        line: i + 1,
        message: JSON.stringify(validate.errors, null, 2),
      });
      continue;
    }

    const line = parsed as { type?: string; version?: string };
    if (line.type === 'release' && typeof line.version === 'string') {
      if (!isSemver(line.version)) {
        failures.push({ file, line: i + 1, message: `release version ${line.version} is not a valid semver version` });
        continue;
      }
      if (previousVersion != null && !semver.gt(line.version, previousVersion)) {
        failures.push({ file, line: i + 1, message: `release version ${line.version} is not above the release before it (${previousVersion})` });
      }
      previousVersion = line.version;
    }
  }
  return failures;
}

// Read and check each file. A file that can't be read is a failure on line 0.
function validateChangesFiles(files: string[]): Failure[] {
  const failures: Failure[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch (err) {
      failures.push({ file, line: 0, message: `cannot read file: ${(err as Error).message}` });
      continue;
    }
    failures.push(...validateChangesContent(file, content));
  }
  return failures;
}

// Check the given files, or when none are given, every changes.jsonl under root.
export async function validateChanges(root: string, files: string[]): Promise<ValidationResult> {
  if (files.length > 0) {
    return { kind: 'checked', failures: validateChangesFiles(files) };
  }
  const found = await findChangesFiles(root);
  if (found.length === 0) {
    return { kind: 'no-files' };
  }
  return { kind: 'checked', failures: validateChangesFiles(found) };
}
