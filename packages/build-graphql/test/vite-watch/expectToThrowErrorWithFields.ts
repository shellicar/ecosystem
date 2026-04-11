import { expect } from 'vitest';

type AbstractNewable = abstract new (...args: any[]) => any;

export const expectToThrowErrorWithFields = <T extends AbstractNewable>(fn: () => unknown, errorType: T, expected: Partial<InstanceType<T>>) => {
  let thrown: unknown;

  try {
    fn();
  } catch (err) {
    thrown = err;
  }

  expect(thrown).toBeInstanceOf(errorType);
  expect(thrown).toMatchObject(expected);
};
