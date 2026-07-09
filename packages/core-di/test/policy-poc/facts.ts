/**
 * Layer 6 — the read-only bridge. Depends on: types, contracts (feature facts), dependsOn (edges).
 *
 * The one-directional coupling between the layers: lifetime facts exposed as
 * data a graph policy can read. Features never see policies; policies see
 * features only through this.
 */
import type { FeatureSet } from './contracts';
import { getDeclaredEdges } from './dependsOn';
import type { LifetimeName, Node, Token } from './types';

export type NodeFacts = { readonly lifetime: LifetimeName; readonly owner: string; readonly deps: Token[] };
export type GraphFacts = Map<Token, NodeFacts>;

export const deriveFacts = (regs: Map<Token, Node>, features: FeatureSet, defaultLifetime: LifetimeName): GraphFacts => {
  const facts: GraphFacts = new Map();
  for (const [token, node] of regs) {
    const lifetime = node.lifetime ?? defaultLifetime;
    const owner = lifetime === 'transient' ? 'none' : (features[lifetime]?.facts.owner ?? 'none');
    facts.set(token, { lifetime, owner, deps: getDeclaredEdges(node.impl).map(([, dep]) => dep) });
  }
  return facts;
};
