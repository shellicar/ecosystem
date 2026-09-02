import { describe, expect, it } from 'vitest';
import { cleanUnusedFiles } from '../src/core/cleanUnusedFiles';
import { resolveOptions } from '../src/core/resolveOptions';
import { createCapturingLogger, createWorkspace } from './support/workspace';

// An output directory that does not exist yet is the ordinary first build. It
// means no files, not a directory that cannot be read, and the two must not be
// treated alike.
describe('the first build', () => {
  it('treats a missing output directory as empty rather than refusing', async () => {
    const workspace = await createWorkspace('first-build-missing');
    const logger = createCapturingLogger();

    await cleanUnusedFiles('not-created-yet', new Set(['dist/main.js']), workspace.root, resolveOptions({ destructive: true, logger }));

    const expected = false;
    const actual = logger.lines.some((line) => line.includes('Refusing to clean'));

    expect(actual).toBe(expected);
  });

  // The build wrote files and the output directory holds none of them, which is
  // what tsup's own clean does just before the plugin looks.
  it('says to disable tsup clean when the output directory is empty but the build produced files', async () => {
    const workspace = await createWorkspace('first-build-empty');
    const logger = createCapturingLogger();

    await cleanUnusedFiles('dist', new Set(['dist/main.js']), workspace.root, resolveOptions({ destructive: true, logger }));

    const expected = true;
    const actual = logger.lines.some((line) => line.includes('Disable tsup "clean: true"'));

    expect(actual).toBe(expected);
  });
});
