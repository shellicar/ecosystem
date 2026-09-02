import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deleteFile } from '../src/core/deleteFile';
import { createCapturingLogger, createWorkspace } from './support/workspace';

// A file that cannot be deleted warns and lets the build carry on. Aborting on
// one unremovable leftover would fail a build that otherwise succeeded.
describe('deleting a file that cannot be removed', () => {
  it('warns rather than throwing', async () => {
    const workspace = await createWorkspace('delete-failure');
    const missing = join(workspace.outDir, 'already-gone.js');
    await writeFile(missing, '// about to disappear\n');
    await rm(missing);
    const logger = createCapturingLogger();

    await deleteFile(missing, logger);

    const expected = true;
    const actual = logger.lines.some((line) => line.includes('Failed to delete'));

    expect(actual).toBe(expected);
  });
});
