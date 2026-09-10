import { lstat } from 'node:fs/promises';

// Asks the filesystem whether two paths are the same file, rather than deciding
// it from the strings. That is what makes the match correct on a case-folding
// filesystem and independent of which separator each side happens to use.
//
// lstat, not stat: following a symlink would give it the identity of whatever it
// points at, so a link sitting in the output directory would be mistaken for the
// file it targets and kept. A hard link is a different matter and cannot be told
// apart this way, because it is not a reference to a file, it is the file.
export const fileIdentity = async (path: string): Promise<string | undefined> => {
  try {
    const stats = await lstat(path);
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return undefined;
  }
};
