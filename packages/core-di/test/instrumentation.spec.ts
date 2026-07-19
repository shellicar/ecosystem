import { describe, expect, it, vi } from 'vitest';
import type { InstrumentationEvent } from '../src';
import { createServiceCollection } from '../src';

// The instrumentation hook is a toggleable way to time
// buildProvider and each resolve. Enabled, it reports a build timing once and a
// resolve timing per call to onTiming; disabled, the hook is present but never
// called, so production pays nothing.
describe('buildProvider instrumentation', () => {
  abstract class IClock {}
  class SystemClock implements IClock {}

  const buildWith = (enabled: boolean, onTiming: (event: InstrumentationEvent) => void) => {
    const services = createServiceCollection();
    services.register(SystemClock).as(IClock).singleton();
    return services.buildProvider({ instrument: { enabled, onTiming } });
  };

  it('reports one build timing when enabled', () => {
    const events: InstrumentationEvent[] = [];

    buildWith(true, (event) => events.push(event));

    const actual = events.filter((event) => event.kind === 'build').length;
    expect(actual).toBe(1);
  });

  it('surfaces the build timing as a numeric duration in milliseconds', () => {
    const events: InstrumentationEvent[] = [];

    buildWith(true, (event) => events.push(event));

    const actual = typeof events[0]?.durationMs;
    expect(actual).toBe('number');
  });

  it('reports a resolve timing carrying the resolved token name', () => {
    const events: InstrumentationEvent[] = [];
    const provider = buildWith(true, (event) => events.push(event));

    provider.resolve(IClock);

    const resolveEvent = events.find((event) => event.kind === 'resolve');
    const expected = { kind: 'resolve', identifier: 'IClock' };
    const actual = resolveEvent === undefined ? undefined : { kind: resolveEvent.kind, identifier: resolveEvent.identifier };
    expect(actual).toEqual(expected);
  });

  it('reports a timing for each resolve call when enabled', () => {
    const events: InstrumentationEvent[] = [];
    const provider = buildWith(true, (event) => events.push(event));

    provider.resolve(IClock);
    provider.resolve(IClock);

    const actual = events.filter((event) => event.kind === 'resolve').length;
    expect(actual).toBe(2);
  });

  it('does not call the hook when disabled', () => {
    const onTiming = vi.fn();
    const provider = buildWith(false, onTiming);

    provider.resolve(IClock);

    expect(onTiming).not.toHaveBeenCalled();
  });
});
