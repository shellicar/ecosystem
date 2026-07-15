import type { OwnerIndex } from './strategy';
import type { GraphNode } from './types';

/** Follows a forward chain to its concrete node; undefined on a broken or cyclic chain. */
export const followForward = (index: OwnerIndex, descriptor: GraphNode): GraphNode | undefined => {
  let node: GraphNode | undefined = descriptor;
  const seen = new Set<GraphNode>();
  while (node?.forwardTarget != null) {
    if (seen.has(node)) {
      return undefined;
    }
    seen.add(node);
    const bucket: readonly GraphNode[] = index.get(node.forwardTarget) ?? [];
    node = bucket[bucket.length - 1];
  }
  return node;
};
