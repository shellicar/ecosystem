import { describe, expect, it } from 'vitest';
import { Strategies } from '../../src/core/strategies';
import { getStrategies, runStrategies } from '../../src/core/version';
import type { ILogger, VersionStrategy } from '../../src/core/types';

const createFakeLogger = (): ILogger => ({
  debug: () => {},
  error: () => {},
});

const decline: VersionStrategy = () => null;

describe('runStrategies', () => {
  it('uses the first strategy that produces a result', () => {
    const first: VersionStrategy = () => ({ version: '1.0.0', branch: 'main' });
    const second: VersionStrategy = () => ({ version: '2.0.0', branch: 'main' });

    const actual = runStrategies([first, second]).version;
    const expected = '1.0.0';

    expect(actual).toBe(expected);
  });

  it('falls through a declining strategy to the next one', () => {
    const answer: VersionStrategy = () => ({ version: '1.0.0', branch: 'main' });

    const actual = runStrategies([decline, answer]).version;
    const expected = '1.0.0';

    expect(actual).toBe(expected);
  });

  it('throws when every strategy declines', () => {
    expect(() => runStrategies([decline, decline])).toThrow('No version strategy produced a result');
  });
});

describe('getStrategies', () => {
  it('uses the supplied strategies instead of the default list', () => {
    const strategies = getStrategies({ strategies: [Strategies.custom(decline)] }, createFakeLogger());

    expect(() => runStrategies(strategies)).toThrow('No version strategy produced a result');
  });
});
