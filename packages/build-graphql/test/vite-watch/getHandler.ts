type Hook<T extends (...args: any[]) => any> = T | { handler: T; order?: 'pre' | 'post' | null; sequential?: boolean };

export const getHandler = <T extends (...args: any[]) => any>(hook: Hook<T> | undefined): T | undefined => {
  if (hook == null) {
    return undefined;
  }
  return typeof hook === 'function' ? hook : hook.handler;
};
