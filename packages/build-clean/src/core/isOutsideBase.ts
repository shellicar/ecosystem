import path, { type posix } from 'node:path';

// Outside means either the route climbs out of the base, or there is no route at
// all. path.relative signals the second case by returning an absolute path,
// which on Windows is what a different drive letter or a UNC share produces.
// `paths` is the semantics the two arguments are written in.
export const isOutsideBase = (baseDir: string, candidate: string, paths: typeof posix = path): boolean => {
  const relativePath = paths.relative(baseDir, candidate);
  return relativePath === '..' || relativePath.startsWith(`..${paths.sep}`) || paths.isAbsolute(relativePath);
};
