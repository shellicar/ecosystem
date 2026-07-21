import { describe, expect, it } from 'vitest';
import { createEnvOverrideStrategy } from '../../src/core/envOverride';

describe('createEnvOverrideStrategy', () => {
  it('declines when no override is set', () => {
    const strategy = createEnvOverrideStrategy({});

    const actual = strategy();

    expect(actual).toBeNull();
  });

  it('uses the override version when set', () => {
    const strategy = createEnvOverrideStrategy({ BUILD_VERSION_OVERRIDE: '2.0.0-rc.1' });

    const actual = strategy()?.version;
    const expected = '2.0.0-rc.1';

    expect(actual).toBe(expected);
  });

  it('uses the override branch when set alongside the version', () => {
    const strategy = createEnvOverrideStrategy({ BUILD_VERSION_OVERRIDE: '2.0.0-rc.1', BUILD_BRANCH_OVERRIDE: 'release/2.0' });

    const actual = strategy()?.branch;
    const expected = 'release/2.0';

    expect(actual).toBe(expected);
  });

  it('defaults the branch to empty when only the version override is set', () => {
    const strategy = createEnvOverrideStrategy({ BUILD_VERSION_OVERRIDE: '2.0.0-rc.1' });

    const actual = strategy()?.branch;
    const expected = '';

    expect(actual).toBe(expected);
  });
});
