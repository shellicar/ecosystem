import path, { type posix } from 'node:path';

// The result is written into generated JavaScript as an import specifier, so it
// has to be relative and forward-slashed whatever the host platform writes.
// `paths` is the semantics the two arguments are written in, and defaults to
// the running platform's, because that is the form the build tools hand over.
export const toImportSpecifier = (from: string, to: string, paths: typeof posix = path): string => paths.relative(from, to).split(paths.sep).join('/');
