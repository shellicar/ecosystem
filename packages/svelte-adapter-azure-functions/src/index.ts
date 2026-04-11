import type { InvocationContext } from '@azure/functions';
import { createAdapter } from './adapter';
import type { ClientPrincipal } from './types';

export { createAdapter };
export default createAdapter;

declare global {
  namespace App {
    export interface Platform {
      clientPrincipal?: ClientPrincipal;
      context: InvocationContext;
    }
  }
}
