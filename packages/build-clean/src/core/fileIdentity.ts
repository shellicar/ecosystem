import { stat } from 'node:fs/promises';

// Asks the filesystem whether two paths are the same file, rather than deciding
// it from the strings. That is what makes the match correct on a case-folding
// filesystem and independent of which separator each side happens to use.
export const fileIdentity = async (path: string): Promise<string | undefined> => {
  try {
    const stats = await stat(path);
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return undefined;
  }
};
