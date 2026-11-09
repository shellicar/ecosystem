/**
 * Config defaults the preset passes to client-preset.
 * A value set in the consumer's `config` replaces the default.
 */
export const defaultConfig = {
  /** Generate GraphQL enums as TypeScript enums. */
  enumType: 'native',
  /** Type custom scalars as `any`. */
  defaultScalarType: 'any',
} as const;
