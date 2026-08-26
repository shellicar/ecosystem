import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { BuildOptions } from 'esbuild';
import type { ILogger } from '../../src/types';

export type Workspace = {
  root: string;
  srcDir: string;
  outDir: string;
};

// Two entry points in different directories, so esbuild emits a nested output
// path. A flat output would match on Windows by accident and prove nothing.
export const createWorkspace = async (name: string): Promise<Workspace> => {
  const root = join('test', '.tmp', name);
  const srcDir = join(root, 'src');
  const outDir = join(root, 'dist');

  await mkdir(join(srcDir, 'nested'), { recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(join(srcDir, 'main.ts'), "import { helper } from './nested/helper';\nconsole.log(helper());\n");
  await writeFile(join(srcDir, 'nested', 'helper.ts'), 'export const helper = () => 42;\n');

  return { root, srcDir, outDir };
};

export const buildOptions = (workspace: Workspace): BuildOptions =>
  ({
    entryPoints: [join(workspace.srcDir, 'main.ts'), join(workspace.srcDir, 'nested', 'helper.ts')],
    outdir: workspace.outDir,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
  }) satisfies BuildOptions;

// Normalised to forward slashes so the assertions are the same on every
// platform. A test that failed on Windows because its own expectation used the
// wrong separator would prove nothing about the plugin.
export const listOutput = async (outDir: string): Promise<string[]> => {
  const walk = async (dir: string): Promise<string[]> => {
    const found: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      found.push(...(entry.isDirectory() ? await walk(full) : [full]));
    }
    return found;
  };

  try {
    const files = await walk(outDir);
    return files.map((file) => relative(outDir, file).split(sep).join('/')).sort();
  } catch {
    // removeEmptyDirs rmdir's the output directory once it has emptied it, so
    // "everything was deleted" arrives here as a missing directory, not as an
    // empty one.
    return [];
  }
};

// Whether two names differing only by case are the same file here. Linux says
// no, macOS and Windows say yes, and that is the whole difference the
// case-mismatch behaviour turns on.
export const filesystemIsCaseInsensitive = (): boolean => {
  const probeDir = join('test', '.tmp', 'case-probe');
  mkdirSync(probeDir, { recursive: true });
  writeFileSync(join(probeDir, 'probe.txt'), 'probe\n');
  return existsSync(join(probeDir, 'PROBE.TXT'));
};

export type CapturingLogger = ILogger & { lines: string[] };

export const createCapturingLogger = (): CapturingLogger => {
  const lines: string[] = [];
  const record =
    (level: string) =>
    (message: string, ...args: unknown[]) => {
      lines.push([`[${level}]`, message, ...args.map((arg) => String(arg))].join(' '));
    };

  return {
    lines,
    debug: record('debug'),
    verbose: record('verbose'),
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
  };
};
