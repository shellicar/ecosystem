import {
  buildEngine,
  createCollection,
  createNaiveStrategy,
  createSingletonLifetime,
  cyclePolicy,
  deriveFacts,
  ForwardBuilder,
  InvalidServiceIdentifierError,
  Lifetime,
  missingTargetPolicy,
  noDeclaredIdentity,
  pushBucket,
  runGraphPolicies,
  ValidationProblemKind,
} from '@shellicar/core-di-engine';
import type { EngineComposition, ServiceIdentifier, SourceType, ValidationProblem, ValidationReport } from '@shellicar/core-di-engine';
import type { IServiceCollection, IServiceProvider } from './interfaces';

// Lite is the focused composition of the shared engine: the singleton feature
// only, singleton as the default lifetime, and every singleton prebaked at
// build. The point is paying resolution cost once: after buildProvider, a
// resolve is a pure lookup.
const liteComposition = (): EngineComposition => ({
  features: { [Lifetime.Singleton]: createSingletonLifetime() },
  defaultLifetime: Lifetime.Singleton,
  prebakeSingletons: true,
  // The naive strategy: recursion instead of compiled plans, so the graph and
  // plan machinery never enter lite's bundle. Warm resolves never construct
  // here anyway (everything prebakes), so the plan's replay speed buys nothing.
  strategy: createNaiveStrategy(),
});

export const createServiceCollection = (): IServiceCollection => {
  const composed = createCollection([Lifetime.Singleton]);

  return {
    register: composed.register as IServiceCollection['register'],
    forward<S extends SourceType>(source: ServiceIdentifier<S>) {
      if (source == null) {
        throw new InvalidServiceIdentifierError();
      }
      return new ForwardBuilder<S>(source, (identifier, descriptor) => pushBucket(composed.regs, identifier, descriptor));
    },
    validate(): ValidationReport {
      const problems: ValidationProblem[] = composed.unfaced().map((node) => ({
        kind: ValidationProblemKind.NoIdentity,
        message: noDeclaredIdentity(node.implementation.name),
      }));
      // No captive or async-path policies: lite composes neither scoped
      // lifetimes nor async factories, so those problems cannot exist here.
      problems.push(...runGraphPolicies(deriveFacts(composed.regs), [missingTargetPolicy, cyclePolicy]));
      return { valid: problems.length === 0, problems };
    },
    buildProvider(): IServiceProvider {
      // validate: true makes prebake failures throw at build (fail fast),
      // rather than being held for the first resolve.
      const engine = buildEngine(composed.regs, liteComposition(), { validate: true });
      return { resolve: engine.resolve, resolveAll: engine.resolveAll };
    },
  };
};
