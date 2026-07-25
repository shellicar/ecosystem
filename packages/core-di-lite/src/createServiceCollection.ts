import type { EngineComposition, ServiceIdentifier, SourceType, ValidationProblem, ValidationReport } from '@shellicar/core-di-engine';
import {
  buildEngine,
  createCollection,
  createNaiveStrategy,
  createSingletonLifetime,
  cyclePolicy,
  type DescriptorMap,
  deriveFacts,
  ForwardBuilder,
  InvalidServiceIdentifierError,
  Lifetime,
  missingTargetPolicy,
  noDeclaredIdentity,
  pushBucket,
  RuntimeCaptivePolicy,
  runGraphPolicies,
  ValidationProblemKind,
} from '@shellicar/core-di-engine';
import type { IServiceCollection, IServiceProvider } from './interfaces';

// Lite is the focused composition of the shared engine: the singleton feature
// only, every registration stamped singleton, and every singleton prebaked at
// build. The point is paying resolution cost once: after buildProvider, a
// resolve is a pure lookup.
const liteComposition = (): EngineComposition => ({
  features: { [Lifetime.Singleton]: createSingletonLifetime() },
  prebakeSingletons: true,
  // The naive strategy: recursion instead of compiled plans, so the graph and
  // plan machinery never enter lite's bundle. Warm resolves never construct
  // here anyway (everything prebakes), so the plan's replay speed buys nothing.
  strategy: createNaiveStrategy(),
  // No scoped lifetime exists here, so the runtime captive cannot fire; None
  // records that answer explicitly rather than enforcing a dead check.
  runtimeCaptivePolicy: RuntimeCaptivePolicy.None,
});

// The engine takes no default lifetime: lite answers its own un-verbed
// registrations here, stamping singleton before the descriptors become a graph.
const stampSingleton = (services: DescriptorMap): void => {
  for (const descriptors of services.values()) {
    for (const descriptor of descriptors) {
      if (descriptor.forwardTarget == null) {
        descriptor.lifetime ??= Lifetime.Singleton;
      }
    }
  }
};

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
      stampSingleton(composed.regs);
      // validate: true makes prebake failures throw at build (fail fast),
      // rather than being held for the first resolve.
      const engine = buildEngine(composed.regs, liteComposition(), { validate: true });
      return { resolve: engine.resolve, resolveAll: engine.resolveAll };
    },
  };
};
