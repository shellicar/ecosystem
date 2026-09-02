import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/core/createLogger';

// The logger every consumer gets when they pass none. The suite otherwise
// injects a fake everywhere, so nothing exercised this, which is how a refusal
// came to print the word undefined to users without a test noticing.
describe('the default logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const captureError = () => {
    const calls: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });
    return calls;
  };

  it('passes the message through to the console', () => {
    const calls = captureError();

    createLogger({ prefix: 'build-cleaner' }).error('something went wrong');

    const expected = true;
    const actual = calls.some((call) => call.includes('something went wrong'));

    expect(actual).toBe(expected);
  });

  // The logger spreads its extra arguments, so a caller passing an absent one
  // still hands console a value to render.
  it('passes nothing beyond the message when called with only a message', () => {
    const calls = captureError();

    createLogger({ prefix: 'build-cleaner' }).error('something went wrong');

    const expected = 2;
    const actual = calls[0].length;

    expect(actual).toBe(expected);
  });

  it('expands an object argument rather than printing it as [object Object]', () => {
    const calls = captureError();

    createLogger({ prefix: 'build-cleaner' }).error({ nested: { value: 1 } } as unknown as string);

    const expected = true;
    const actual = calls[0].some((argument) => typeof argument === 'string' && argument.includes('nested'));

    expect(actual).toBe(expected);
  });

  // What resolveOptions hands it for every consumer who asks for neither, since
  // both default to false there.
  it('says nothing at debug level when debug is off', () => {
    const calls: unknown[][] = [];
    vi.spyOn(console, 'debug').mockImplementation((...args: unknown[]) => {
      calls.push(args);
    });

    createLogger({ prefix: 'build-cleaner', debug: false }).debug('noise');

    const expected = 0;
    const actual = calls.length;

    expect(actual).toBe(expected);
  });
});
