import './quickstart.js';

// * Type-safe registration.
import './typesafe-registration.js';
// * Type-safe resolution.
import './typesafe-resolution.js';
// * Provide factory methods for instantiating classes.
import './factory-methods.js';
// * Use property injection with decorators for simple dependency definition.
import './property-injection.js';
// * Provide multiple implementations for identifiers and provide a `resolveAll` method.
import './resolve-all.js';
// * Define instance lifetime with simple builder pattern.
import './instance-lifetime.js';
// * Create scopes to allow "per-request" lifetimes.
import './scoped-lifetime.js';
// * Register classes during a scope
import './register-during-scope.js';
// * Multiple registrations
import './multiple-registration.js';
// * Override registrations (e.g.: for testing)
import './override-registration.js';
// * Override lifetimes (e.g.: for testing)
import './override-lifetime.js';
// * Logging options
import './logging-options.js';
// * Service modules
import './service-modules.js';
// * Async build with usingAsync and buildProviderAsync
import './async-build.js';
// * Eager singleton construction at build
import './eager-construction.js';
// * Per-lifetime disposal (Symbol.dispose / Symbol.asyncDispose)
import './disposal.js';
// * Static validation with validate() and buildProvider({ validate: true })
import './validation.js';
// * Inspect the built dependency graph with printGraph
import './print-graph.js';
// * Circular dependency detection
import './circular-dependency.js';
