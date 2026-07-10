/**
 * Installs the `Symbol.metadata` polyfill `@dependsOn` needs to record edges
 * at class-definition time. V8 does not ship `Symbol.metadata` yet; TS's
 * emitted decorator plumbing looks it up when a decorated class is evaluated,
 * so this must run before any decorated class is. Browser-safe: no
 * Node-specific APIs.
 *
 * The barrel (`@shellicar/core-di`) imports this as a side effect, so
 * importing `dependsOn` installs it with no consumer action. Import this
 * subpath (`@shellicar/core-di/polyfill`) directly for explicit control over
 * when it installs — the `reflect-metadata` idiom.
 */
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');

export {};
