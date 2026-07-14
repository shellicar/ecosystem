import { equal } from 'node:assert/strict';
import { createServiceCollection } from '@shellicar/core-di';

let constructions = 0;
class Warmup {
  constructor() {
    constructions++;
  }
}

// A singleton is lazy by default — built at first resolve. `.eager()` opts it
// into construction at buildProvider() instead. It composes with the lifetime
// verbs in any chain order and is offered only on a singleton.
const services = createServiceCollection();
services.register(Warmup).asSelf().singleton().eager();

const provider = services.buildProvider();
equal(constructions, 1); // constructed at build, before any resolve

provider.resolve(Warmup);
equal(constructions, 1); // still one — a warm singleton resolve is a lookup
