/**
 * Config defaults that keep the generated output of 1.x where client-preset 6 changed its own defaults.
 * A value set in the consumer's `config` replaces the default.
 */
export const defaultConfig = {
  /** Generate GraphQL enums as TypeScript enums, as 1.x did. client-preset 6 defaults to string-literal unions. */
  enumType: 'native',
  /** Type custom scalars as `any`, as 1.x did. client-preset 6 defaults to `unknown`. */
  defaultScalarType: 'any',
} as const;
