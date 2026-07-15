import { createNaiveStrategy } from '@shellicar/core-di-engine';
import { holder } from './strategyHolder';

// The parity run: the entire engine suite, executed under the naive strategy.
// The strategies own only how construction is driven; every observable
// behaviour must be identical, and this run is what holds that line.
holder.factory = createNaiveStrategy();

await import('./boundaryEngine.spec');
