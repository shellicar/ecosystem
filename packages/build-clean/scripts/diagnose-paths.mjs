// Observes esbuild only - the clean plugin is deliberately not loaded here, so
// the output is evidence about esbuild's metafile, not about our code. Run from
// the package directory. Always exits 0: it reports, it does not judge.
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { build } from 'esbuild';

const root = join('test', '.diagnostics');
const srcDir = join(root, 'src');
const outDir = join(root, 'dist');

await mkdir(join(srcDir, 'nested'), { recursive: true });
await writeFile(join(srcDir, 'main.ts'), "import { helper } from './nested/helper';\nconsole.log(helper());\n");
await writeFile(join(srcDir, 'nested', 'helper.ts'), 'export const helper = () => 42;\n');

const result = await build({
  entryPoints: [join(srcDir, 'main.ts'), join(srcDir, 'nested', 'helper.ts')],
  outdir: outDir,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  metafile: true,
});

const walk = async (dir) => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    found.push(...(entry.isDirectory() ? await walk(full) : [full]));
  }
  return found;
};

const metafileKeys = Object.keys(result.metafile.outputs).sort();
const walked = (await walk(outDir)).sort();
const relatives = walked.map((file) => relative(process.cwd(), file));

console.log(`platform      : ${process.platform}`);
console.log(`node          : ${process.version}`);
console.log(`path.sep      : ${JSON.stringify(sep)}`);
console.log(`process.cwd() : ${process.cwd()}`);
console.log(`outdir given  : ${JSON.stringify(outDir)}`);
console.log('');
console.log('esbuild metafile output keys (what the plugin matches against):');
for (const key of metafileKeys) {
  console.log(`  ${JSON.stringify(key)}`);
}
console.log('');
console.log('path.relative(cwd, walkedFile) (what the plugin computes per file):');
for (const value of relatives) {
  console.log(`  ${JSON.stringify(value)}`);
}
console.log('');

const built = new Set(metafileKeys);
const missed = relatives.filter((value) => !built.has(value));

console.log(`string match : ${relatives.length - missed.length} of ${relatives.length}`);
if (missed.length > 0) {
  console.log('');
  console.log('MISSED by string comparison - these are freshly-built files:');
  for (const value of missed) {
    console.log(`  ${JSON.stringify(value)}`);
  }
}

// Identity matching is what the plugin uses instead of string comparison. dev
// and ino are printed raw because ino is the part whose value on Windows cannot
// be assumed: a zero there would collapse every file onto one identity.
console.log('');
console.log('stat identity, from the metafile key:');
const identityOf = async (path) => {
  try {
    const stats = await stat(path);
    return `${stats.dev}:${stats.ino}`;
  } catch (error) {
    return `unreadable (${error.code})`;
  }
};

const builtIdentities = new Set();
for (const key of metafileKeys) {
  const identity = await identityOf(resolve(process.cwd(), key));
  builtIdentities.add(identity);
  console.log(`  ${JSON.stringify(key)} -> ${identity}`);
}

console.log('');
console.log('stat identity, from the walked file:');
let identityMatches = 0;
for (const file of walked) {
  const identity = await identityOf(file);
  const hit = builtIdentities.has(identity);
  if (hit) {
    identityMatches++;
  }
  console.log(`  ${JSON.stringify(file)} -> ${identity} ${hit ? 'MATCH' : 'NO MATCH'}`);
}

console.log('');
console.log(`identity match : ${identityMatches} of ${walked.length}`);
console.log(`distinct built identities : ${builtIdentities.size} (expected ${metafileKeys.length}; fewer means ino is not distinguishing files)`);
