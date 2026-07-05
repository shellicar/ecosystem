import { Clock } from '@js-joda/core';
import { describe, expect, it } from 'vitest';
import { createServiceCollection, LogLevel } from '../src';

describe('Clock registrations', () => {
  const services = createServiceCollection({ logLevel: LogLevel.Debug });

  it('can register Clock as itself via a factory', () => {
    const expected = Clock.systemUTC();
    services
      .register(Clock)
      .using(() => expected)
      .asSelf()
      .singleton();
    const provider = services.buildProvider();

    const actual = provider.resolve(Clock);

    expect(actual).toBe(expected);
  });
});
