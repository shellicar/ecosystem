import { deepEqual } from 'node:assert/strict';
import { createServiceCollection, dependsOn } from '@shellicar/core-di';

abstract class IClock {}
class SystemClock implements IClock {}

abstract class IGreeter {}
class Greeter implements IGreeter {
  @dependsOn(IClock) public readonly clock!: IClock;
}

// printGraph reads the static graph derived at build — no construction — and
// writes a human-readable visualisation: each token, its implementation and
// lifetime, and its @dependsOn and forward edges. It defaults to console.log;
// here a line sink captures the output so it can be asserted, then printed.
const services = createServiceCollection();
services.register(SystemClock).as(IClock).singleton();
services.register(Greeter).as(IGreeter).scoped();
const provider = services.buildProvider();

const lines: string[] = [];
provider.printGraph((line) => lines.push(line));
for (const line of lines) {
  console.log(line);
}

deepEqual(lines, ['Dependency graph (2 registrations)', 'IClock -> SystemClock [SINGLETON]', 'IGreeter -> Greeter [SCOPED]', '    -> IClock']);
