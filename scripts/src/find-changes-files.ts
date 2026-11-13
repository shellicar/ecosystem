import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';

// Find every changes.jsonl under a root, skipping folders that hold installed, generated or git files.

const EXCLUDED_FOLDERS = new Set(['node_modules', '.git', 'dist']);

// A path is excluded when one of its folders is named node_modules, .git or dist.
// A name that only contains one of them, such as build-dist-tag, is not excluded.
export function isExcludedPath(path: string): boolean {
  return path.split(/[\\/]/).some((folder) => EXCLUDED_FOLDERS.has(folder));
}

// Absolute paths of every changes.jsonl under root, in the order glob finds them.
export async function findChangesFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of glob('**/changes.jsonl', { cwd: root, exclude: isExcludedPath })) {
    files.push(resolve(root, entry));
  }
  return files;
}
