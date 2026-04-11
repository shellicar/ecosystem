declare module 'SERVER' {
  export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
  export const manifest: import('@sveltejs/kit').SSRManifest;
}

interface String {
  split(separator: string | RegExp): [string, ...string[]];
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string;
  }
}
