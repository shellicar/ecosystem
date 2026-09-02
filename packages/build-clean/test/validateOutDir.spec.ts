import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateOutDir } from '../src/core/validateOutDir';
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
    expect(validate('.')).toThrow('Refusing to clean current directory');
  });

  it('refuses a parent of the base directory', () => {
    expect(validate('..')).toThrow('Refusing to clean parent directory');
  });

  it('refuses a sibling of the base directory', () => {
    expect(validate('../elsewhere')).toThrow('Refusing to clean directory outside project');
  });

  it('refuses a source directory', () => {
    expect(validate('src')).toThrow('Refusing to clean source directory');
  });

  it('refuses a nested source directory', () => {
    expect(validate('packages/thing/lib')).toThrow('Refusing to clean source directory');
  });

  // The refusal has to name what the caller wrote in their config, not the path
  // it was resolved to, or it points at nothing they can go and edit.
  it('names the configured value in the refusal, not the resolved path', () => {
    expect(validate('src')).toThrow('"src"');
  });
});
