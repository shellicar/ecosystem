import { type DocumentNode, type GraphQLNamedType, type GraphQLSchema, getNamedType, isInputObjectType, isInterfaceType, isObjectType, isUnionType, TypeInfo, visit, visitWithTypeInfo } from 'graphql';
import { BUILT_IN_SCALARS } from './consts';

export function collectReachableTypes(schema: GraphQLSchema, documents: DocumentNode[]): Set<string> {
  const reachable = new Set<string>();

  function addType(type: GraphQLNamedType | null | undefined): void {
    if (type == null) {
      return;
    }
    if (BUILT_IN_SCALARS.has(type.name)) {
      return;
    }
    if (reachable.has(type.name)) {
      return;
    }
    reachable.add(type.name);

    if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        addType(getNamedType(field.type));
      }
    } else if (isObjectType(type) || isInterfaceType(type)) {
      // Must recurse into all fields to keep the filtered schema valid —
      // if a type is included, all types it references must also be included.
      for (const field of Object.values(type.getFields())) {
        addType(getNamedType(field.type));
        for (const arg of field.args) {
          addType(getNamedType(arg.type));
        }
      }
      if (isObjectType(type)) {
        for (const iface of type.getInterfaces()) {
          addType(iface);
        }
      }
    } else if (isUnionType(type)) {
      for (const member of type.getTypes()) {
        addType(member);
      }
    }
  }

  const typeInfo = new TypeInfo(schema);
  for (const doc of documents) {
    visit(
      doc,
      visitWithTypeInfo(typeInfo, {
        VariableDefinition() {
          addType(getNamedType(typeInfo.getInputType()));
        },
        Field() {
          addType(getNamedType(typeInfo.getType()));
          const fieldDef = typeInfo.getFieldDef();
          if (fieldDef) {
            for (const arg of fieldDef.args) {
              addType(getNamedType(arg.type));
            }
          }
        },
        FragmentDefinition(node) {
          addType(schema.getType(node.typeCondition.name.value));
        },
        InlineFragment(node) {
          if (node.typeCondition) {
            addType(schema.getType(node.typeCondition.name.value));
          }
        },
      }),
    );
  }

  return reachable;
}
