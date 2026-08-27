import { sep } from 'node:path';

// glob returns paths in the platform's own form, and the watch registrations
// these feed take them either way. Which files get registered is the behaviour;
// the separator is not, so it is normalised out of the comparison.
export const toPosix = (paths: string[]): string[] => paths.map((path) => path.split(sep).join('/'));
