import { describe, expect, it } from 'vitest';
import { createServiceCollection, dependsOn } from '../src';

// printGraph is the graph-inspection capability on the built provider: it reads
// the static graph derived at build and writes a visualisation, one line per
// `write` call. These tests drive it through the public surface — the pure
// rendering is unit-tested against a hand-built graph in graph.spec.ts.
describe('IServiceProvider.printGraph', () => {
  it('visualises the tokens, edges and lifetimes of the built graph', () => {
    abstract class IClock {}
    class SystemClock implements IClock {}
    abstract class IGreeter {}
    class Greeter implements IGreeter {
      @dependsOn(IClock) public readonly clock!: IClock;
    }
    abstract class ILegacyClock {}

    const services = createServiceCollection();
    services.register(SystemClock).as(IClock).singleton();
    services.register(Greeter).as(IGreeter).scoped();
    services.forward(ILegacyClock).to(IClock);
    const provider = services.buildProvider();

    const lines: string[] = [];
    provider.printGraph((line) => lines.push(line));

    const expected = ['Dependency graph (3 registrations)', 'IClock -> SystemClock [SINGLETON]', 'IGreeter -> Greeter [SCOPED]', '    -> IClock', 'ILegacyClock -> IClock (forward)'];
    const actual = lines;

    expect(actual).toEqual(expected);
  });

  it('constructs nothing while printing the graph', () => {
    let constructions = 0;
    abstract class IClock {}
    class SystemClock implements IClock {
      constructor() {
        constructions++;
      }
    }

    const services = createServiceCollection();
    services.register(SystemClock).as(IClock).singleton();
    const provider = services.buildProvider();

    provider.printGraph(() => {});

    expect(constructions).toBe(0);
  });
});
