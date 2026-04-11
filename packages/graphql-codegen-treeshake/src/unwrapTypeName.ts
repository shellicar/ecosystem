import { Kind, type TypeNode } from 'graphql';

export function unwrapTypeName(typeNode: TypeNode): string {
  if (typeNode.kind === Kind.NAMED_TYPE) {
    return typeNode.name.value;
  }
  return unwrapTypeName(typeNode.type);
}
