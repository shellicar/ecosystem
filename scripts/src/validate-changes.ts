import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateChanges } from './changes-validation.js';

// Validate the changes.jsonl files named as arguments, or every one in the repo when none are named.
// Exits 0 when they pass, 1 when any fails, and 2 when none are found.

// scripts/src -> scripts -> repo root
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function main() {
  const result = await validateChanges(repoRoot, process.argv.slice(2));

  if (result.kind === 'no-files') {
    console.error('no changes.jsonl files found');
    process.exit(2);
  }

  const { failures } = result;
  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`error validating ${f.file}:${f.line}`);
      console.error(f.message);
    }
    const n = failures.length;
    console.error(`\n${n} error${n === 1 ? '' : 's'}`);
    process.exit(1);
  }

  console.log('no errors found');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
