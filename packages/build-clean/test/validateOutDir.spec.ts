import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateOutDir } from '../src/core/validateOutDir';
import { OutputDirectoryContainsBaseError } from '../src/errors/OutputDirectoryContainsBaseError';
import { OutputDirectoryIsBaseError } from '../src/errors/OutputDirectoryIsBaseError';
import { OutputDirectoryIsSourceError } from '../src/errors/OutputDirectoryIsSourceError';
import { OutputDirectoryOutsideBaseError } from '../src/errors/OutputDirectoryOutsideBaseError';
import { createCapturingLogger } from './support/workspace';

// validateOutDir is the only thing standing between the plugin and a directory
// it was never asked to clean, and it does no IO, so the refusals test directly.
// The base is built with resolve so it is native on whichever platform runs.
const base = resolve('proj');
const validate = (outDir: string) => () => validateOutDir(outDir, base, createCapturingLogger());

describe('validateOutDir', () => {
  it('accepts a directory below the base directory', () => {
    expect(validate('dist')).not.toThrow();
  });

  it('accepts a nested directory below the base directory', () => {
    expect(validate('build/output')).not.toThrow();
  });

  it('accepts an absolute directory below the base directory', () => {
    expect(validate(resolve(base, 'dist'))).not.toThrow();
  });

  it('returns the directory resolved against the base', () => {
    const expected = resolve(base, 'dist');
    const actual = validateOutDir('dist', base, createCapturingLogger());

    expect(actual).toBe(expected);
  });

  it('refuses the base directory itself', () => {
    expect(validate('.')).toThrow(OutputDirectoryIsBaseError);
  });

  it('refuses a parent of the base directory', () => {
    expect(validate('..')).toThrow(OutputDirectoryContainsBaseError);
  });

  it('refuses a sibling of the base directory', () => {
    expect(validate('../elsewhere')).toThrow(OutputDirectoryOutsideBaseError);
  });

  it('refuses a source directory', () => {
    expect(validate('src')).toThrow(OutputDirectoryIsSourceError);
  });

  it('refuses a nested source directory', () => {
    expect(validate('packages/thing/lib')).toThrow(OutputDirectoryIsSourceError);
  });

  // The refusal carries what the caller wrote in their config, not the path it
  // was resolved to, so it points at something they can go and edit.
  it('carries the configured value rather than the resolved path', () => {
    const expected = 'src';
    const actual = new OutputDirectoryIsSourceError('src').outDir;

    expect(actual).toBe(expected);
  });
});
