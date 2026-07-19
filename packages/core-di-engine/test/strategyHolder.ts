import type { StrategyFactory } from '../src';
import { createPlanStrategy } from '../src';

/**
 * The strategy the engine specs compose with. Plan by default; the naive parity
 * run (boundaryEngine-naive.spec.ts) swaps the factory before importing the
 * spec, so the identical suite proves both strategies behave the same. Works
 * because vitest evaluates each spec file in its own module graph.
 */
export const holder: { factory: StrategyFactory } = { factory: createPlanStrategy() };
