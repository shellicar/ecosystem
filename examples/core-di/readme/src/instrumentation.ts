import { deepEqual } from 'node:assert/strict';
import { createServiceCollection, type InstrumentationEvent } from '@shellicar/core-di';

abstract class IClock {}
class SystemClock implements IClock {}

// The instrumentation hook times buildProvider and each resolve when enabled,
// handing each timing to onTiming. Enabled here, building emits one build
// timing and each resolve emits a resolve timing carrying the token name.
const timings: InstrumentationEvent[] = [];
const services = createServiceCollection();
services.register(SystemClock).as(IClock).singleton();
const provider = services.buildProvider({
  instrument: {
    enabled: true,
    onTiming: (event) => timings.push(event),
  },
});

provider.resolve(IClock);

for (const timing of timings) {
  console.log(timing.kind === 'resolve' ? `resolve ${timing.identifier}: ${timing.durationMs}ms` : `build: ${timing.durationMs}ms`);
}

// durationMs varies run to run, so assert the deterministic shape (kind, and the
// token name a resolve carries) rather than the timing itself.
const shapes = timings.map((timing) => (timing.kind === 'resolve' ? { kind: timing.kind, identifier: timing.identifier } : { kind: timing.kind }));
deepEqual(shapes, [{ kind: 'build' }, { kind: 'resolve', identifier: 'IClock' }]);

// Off by default: with enabled false the hook is present but never called, so a
// production build pays nothing.
const offTimings: InstrumentationEvent[] = [];
const offServices = createServiceCollection();
offServices.register(SystemClock).as(IClock).singleton();
const offProvider = offServices.buildProvider({
  instrument: {
    enabled: false,
    onTiming: (event) => offTimings.push(event),
  },
});
offProvider.resolve(IClock);
deepEqual(offTimings, []);
