import { posix } from 'node:path';

// The result is written into generated JavaScript as an import specifier, so it
// has to be relative and forward-slashed whatever the host platform writes.
// `paths` is the semantics the two arguments are written in.
export const toImportSpecifier = (from: string, to: string, paths: typeof posix = posix): string => paths.relative(from, to);
