import type { RolldownPlugin } from 'unplugin';
import { plugin } from './core/plugin';
import type { Options } from './types';

// Annotated with unplugin's alias so the emitted declaration names unplugin's type,
// even where the build can't resolve rolldown.
const rolldown: (options: Options) => RolldownPlugin | RolldownPlugin[] = plugin.rolldown;

export default rolldown;
