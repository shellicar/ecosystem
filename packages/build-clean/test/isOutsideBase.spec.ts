import { posix, win32 } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isOutsideBase } from '../src/core/isOutsideBase';

describe('isOutsideBase', () => {
  it('treats a directory below the base as inside', () => {
    const expected = false;
    const actual = isOutsideBase('/proj', '/proj/dist', posix);

    expect(actual).toBe(expected);
  });

  it('treats a directory whose name merely starts with dots as inside', () => {
    const expected = false;
    const actual = isOutsideBase('/proj', '/proj/..hidden', posix);

    expect(actual).toBe(expected);
  });

  it('treats a sibling of the base as outside', () => {
    const expected = true;
    const actual = isOutsideBase('/proj', '/elsewhere', posix);

    expect(actual).toBe(expected);
  });

  // The case no existing guard caught. On Windows there is no relative route
  // between drives, so relative returns the target unchanged and a check for a
  // leading ".." reads false.
  it('treats another drive as outside', () => {
    const expected = true;
    const actual = isOutsideBase('C:\\proj', 'D:\\stuff', win32);

    expect(actual).toBe(expected);
  });

  it('treats a UNC share as outside', () => {
    const expected = true;
    const actual = isOutsideBase('C:\\proj', '\\\\server\\share\\stuff', win32);

    expect(actual).toBe(expected);
  });

  it('treats a directory below the base on the same drive as inside', () => {
    const expected = false;
    const actual = isOutsideBase('C:\\proj', 'C:\\proj\\dist', win32);

    expect(actual).toBe(expected);
  });
});
