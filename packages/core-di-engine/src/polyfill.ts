/**
 * Installs the `Symbol.metadata` polyfill `@dependsOn` needs. V8 does not ship it
 * yet, and it must run before any decorated class evaluates. The barrel imports
 * it as a side effect; import this subpath for explicit control.
 */
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');

export {};
