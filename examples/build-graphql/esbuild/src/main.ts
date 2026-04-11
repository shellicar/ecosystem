import { inspect } from 'node:util';
import { typedefs } from './typedefs';

console.log(inspect(typedefs, { depth: Infinity }));
