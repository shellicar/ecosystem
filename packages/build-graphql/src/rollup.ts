import type { RollupPlugin } from 'unplugin';
import { plugin } from './core/plugin';
import type { Options } from './types';

// Annotated with unplugin's alias so the emitted declaration names unplugin's type,
// whichever copy of rollup the build can resolve.
const rollup: (options: Options) => RollupPlugin | RollupPlugin[] = plugin.rollup;

export default rollup;
