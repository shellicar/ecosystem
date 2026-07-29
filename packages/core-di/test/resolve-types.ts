import { createServiceCollection, IResolutionScope, IScopedProvider, IServiceProvider } from '../src';

// Type-level only: never executed, and its point is that it type-checks. The root's
// resolve refuses IScopedProvider through a conditional on the token, and that
// conditional separates the two provider types structurally. Anything that made them
// mutually assignable would start refusing IServiceProvider here instead, silently, so
// the tokens that must keep working are asserted alongside the one that must not.
export const rootResolves = () => {
  const provider = createServiceCollection().buildProvider();

  const self: IServiceProvider = provider.resolve(IServiceProvider);
  const scope: IResolutionScope = provider.resolve(IResolutionScope);

  // @ts-expect-error - the root is not a scope, so it cannot be asked for one
  provider.resolve(IScopedProvider);

  return [self, scope];
};

export const scopeResolves = () => {
  const scope = createServiceCollection().buildProvider().createScope();

  const itself: IScopedProvider = scope.resolve(IScopedProvider);

  return itself;
};
