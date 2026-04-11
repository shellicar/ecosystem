import { buildASTSchema, type GraphQLSchema, Kind, parse, printSchema } from 'graphql';
import { unwrapTypeName } from './unwrapTypeName';

export function buildFilteredSchema(schema: GraphQLSchema, reachable: Set<string>): GraphQLSchema {
  const fullAst = parse(printSchema(schema));

  const rootTypeNames = new Set([schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()].filter((t) => t != null).map((t) => t.name));

  const filteredDefinitions = fullAst.definitions
    .filter((def) => {
      if (def.kind === Kind.SCHEMA_DEFINITION || def.kind === Kind.SCHEMA_EXTENSION) {
        return true;
      }
      if ('name' in def && def.name) {
        return rootTypeNames.has(def.name.value) || reachable.has(def.name.value);
      }
      return false;
    })
    .map((def) => {
      if (def.kind !== Kind.OBJECT_TYPE_DEFINITION || !rootTypeNames.has(def.name.value) || !def.fields) {
        return def;
      }
      return {
        ...def,
        fields: def.fields.filter((field) => {
          if (!reachable.has(unwrapTypeName(field.type))) {
            return false;
          }
          return field.arguments?.every((arg) => reachable.has(unwrapTypeName(arg.type))) ?? true;
        }),
      };
    });

  return buildASTSchema({ kind: Kind.DOCUMENT, definitions: filteredDefinitions });
}
